# What's wrong with hdparm.conf

You can spend hours googling for "hdparm.conf settings not working" just to find yourself trapped in a net of circular references pointing fingers between udev, pm-utils, systemd, and hdparm issues. 

In my case, it all started one night when I wanted to set a _very_ aggresive spindown setting on a hdd. These are the events that followed, and a workaround that I found to make it work.

First things first.

```sh
$ lsb_release -d
Description:	Ubuntu 22.04.2 LTS
```

I set hdparm.conf apm=99 (-B in hdparm cli) on my hdd but it didn't have any effect.

```sh
$ tail -10 /etc/hdparm.conf
# /dev/sdb
/dev/disk/by-id/ata-HGST_HTS722010A7E645_JR2000BDH3R15E {
	apm = 99
}
```

Looks like `hdparm.conf` is picked up by `/lib/udev/hdparm` invoked by udev rules in `/lib/udev/rules.d/85-hdparm.rules`.
However it specifically ignores any APM (-B) setting, letting `/usr/lib/pm-utils/power.d/95hdparm-apm` take care of them.
Now, `95hdparm-apm` relies on a bunch of functions present in `/lib/hdparm/hdparm-functions`. It uses `hdparm_try_apm` to check if the device has support for APM.

```sh
    # Only activate APM on disks that support it.
    if [ -z "$ID_ATA_FEATURE_SET_APM" ]; then
        local ID_ATA_FEATURE_SET_APM="$(udevadm info -n "$1" -q property 2>/dev/null | sed -n 's/^ID_ATA_FEATURE_SET_APM=//p')" || true
    fi
```

The problem is that `udevadm info -n /dev/sdb` is not showing any sign of `ID_ATA_FEATURE_SET_APM=1` that indicated the disk supported APM.

The disk supports APM though. The disk reports APM capabilities when queried with `hdparm -I /dev/sdb` and they can be set with the cli `hdparm -B99 /dev/sdb`. On a closer look, also calling `/lib/udev/ata_id --export /dev/sdb` shows that the value `ID_ATA_FEATURE_SET_APM=1` is present.

```sh
$ /lib/udev/ata_id --export /dev/sdb|grep ATA_FEATURE_SET_APM
ID_ATA_FEATURE_SET_APM=1
ID_ATA_FEATURE_SET_APM_ENABLED=1
ID_ATA_FEATURE_SET_APM_CURRENT_VALUE=128
```

These device environment values are supposed to be imported with the rules in `/lib/udev/rules.d/60-persistent-storage.rules`

```sh
# ATA
KERNEL=="sd*[!0-9]|sr*", ENV{ID_SERIAL}!="?*", SUBSYSTEMS=="scsi", ATTRS{vendor}=="ATA", IMPORT{program}="ata_id --export $devnode" 
```

But at that point `/dev/sdb`'s `ID_SERIAL` is already set, this rule never matches and the IMPORT is never performed.

The package `sg3-utils` is the one installing the conflicting file `/lib/udev/rules.d/55-scsi-sg3_id.rules`

```sh
# ata_id compatibility
ENV{ID_SERIAL}!="?*", ENV{SCSI_IDENT_LUN_ATA}=="?*", ENV{ID_BUS}="ata", ENV{ID_ATA}="1", ENV{ID_SERIAL}="$env{SCSI_IDENT_LUN_ATA}"
ENV{ID_SERIAL_SHORT}!="?*", ENV{SCSI_VENDOR}=="ATA", ENV{SCSI_IDENT_LUN_VENDOR}=="?*", ENV{ID_SERIAL_SHORT}="$env{SCSI_IDENT_LUN_VENDOR}"
```

Ok, now what? Well, after a lot of back and forth with systemd, I found an old Pull Request that addresses this issue.
It refactors how persistent storage rules are organized so they run _before_ sg3-utils had any chance to mess them up.

Unfortunately, the PR is still opened after 5 years, and is unclear when it's going to land on linux distros.

#### The workaround

We need to import the ata_id environment keys for our hard drive. We'll introduce a `61-persistent-storage-custom.rules` file
with a custom rule rule that runs ata_id.

```sh
$ cat /etc/udev/61-persistent-storage-custom.rules
# Import the ata_id environment values for /dev/sdb regardless of the ID_SERIAL (needed by 85-hdparm.rules)
KERNEL=="sdb", SUBSYSTEMS=="scsi", ATTRS{vendor}=="ATA", IMPORT{program}="ata_id --export $devnode"
```

Reboot and see the hdparm magic unfold!

<script data-goatcounter="https://mauri.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>
