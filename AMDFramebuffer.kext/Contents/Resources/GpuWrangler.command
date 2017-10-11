#!/bin/sh

#  AddGpuWrangler.sh
#  ATIFramebuffer
#
#  Created by vstempen on 2017-02-22.
#


if [ $# -lt 2 ]
then
echo "usage: GpuWrangler [add/delete] [plist file name]"
fi

oldMatchCategory=IOFramebuffer
newMatchCategory=ATIFramebuffer
action=$1
file=$2

if echo "$file" | grep '/System/Library/Extensions/'; then
patchOS=true
usesudo=sudo
fi

if [ "$action" == "add" ] || [ "$action" == "delete" ]; then

if [ -f "$file" ] ; then

devices=`/usr/libexec/PlistBuddy -c "print :IOKitPersonalities:Controller:IOPCIMatch" $file`
bundleid=`/usr/libexec/PlistBuddy -c "print :IOKitPersonalities:Controller:CFBundleIdentifier" $file`
score=`/usr/libexec/PlistBuddy -c "print :IOKitPersonalities:Controller:IOProbeScore" $file`
class=`/usr/libexec/PlistBuddy -c "print :IOKitPersonalities:Controller:IOClass" $file`
if [[ -z $devices ]] || [[ -z $bundleid ]] || [[ -z $score ]]; then
echo "Wrong plist format."
else
wid=Wrangler
wclass=$class$wid

if [ "$action" == "add" ]; then
echo "Before adding GpuWrangler, trying to remove old GpuWrangler properties..."
fi
wrangler=`/usr/libexec/PlistBuddy -c "print :IOKitPersonalities:AtiGpuWrangler" $file`
propertymatch=`/usr/libexec/PlistBuddy -c "print :IOKitPersonalities:Controller:IOPropertyMatch" $file`
categorymatch=`/usr/libexec/PlistBuddy -c "print :IOKitPersonalities:Controller:IOMatchCategory" $file`

if [[ ! -z $wrangler ]]; then
$usesudo /usr/libexec/PlistBuddy -c "Delete :IOKitPersonalities:AtiGpuWrangler" $file
echo ":IOKitPersonalities:AtiGpuWrangler removed."
cacheupdate=true
fi
if [[ ! -z $propertymatch ]]; then
$usesudo /usr/libexec/PlistBuddy -c "Delete :IOKitPersonalities:Controller:IOPropertyMatch" $file
echo ":IOKitPersonalities:Controller:IOPropertyMatch removed."
cacheupdate=true
fi
if [ "$categorymatch" != "$oldMatchCategory" ]; then
$usesudo /usr/libexec/PlistBuddy -c "Set :IOKitPersonalities:Controller:IOMatchCategory $oldMatchCategory" $file
echo ":IOKitPersonalities:Controller:IOMatchCategory set to $oldMatchCategory"
cacheupdate=true
fi

if [ "$action" == "add" ]; then
safeToAdd=true
if [ "$patchOS" = true ]; then

if grep -r $newMatchCategory /System/Library/Extensions/AMDRadeonX*.kext; then
echo "Accelerator is ready for GpuWrangler"
else
echo "Accelerator is not ready for GpuWrangler. Cannot add GpuWrangler properties to plist"
safeToAdd=false
fi
fi
if [ "$safeToAdd" = true ]; then
echo "Adding GpuWrangler..."
$usesudo /usr/libexec/PlistBuddy -c "Add :IOKitPersonalities:AtiGpuWrangler dict " $file
$usesudo /usr/libexec/PlistBuddy -c "Add :IOKitPersonalities:AtiGpuWrangler:IOMatchCategory string IOFramebuffer" $file
$usesudo /usr/libexec/PlistBuddy -c "Add :IOKitPersonalities:AtiGpuWrangler:IOPCIMatch string $devices" $file
$usesudo /usr/libexec/PlistBuddy -c "Add :IOKitPersonalities:AtiGpuWrangler:CFBundleIdentifier string $bundleid" $file
$usesudo /usr/libexec/PlistBuddy -c "Add :IOKitPersonalities:AtiGpuWrangler:IOClass string $wclass" $file
$usesudo /usr/libexec/PlistBuddy -c "Add :IOKitPersonalities:AtiGpuWrangler:IOProviderClass string IOPCIDevice" $file
$usesudo /usr/libexec/PlistBuddy -c "Add :IOKitPersonalities:AtiGpuWrangler:IOProbeScore string $score" $file
$usesudo /usr/libexec/PlistBuddy -c "Add :IOKitPersonalities:AtiGpuWrangler:IOPCITunnelCompatible bool true" $file
echo ":IOKitPersonalities:AtiGpuWrangler added."

$usesudo /usr/libexec/PlistBuddy -c "Add :IOKitPersonalities:Controller:IOPropertyMatch dict" $file
$usesudo /usr/libexec/PlistBuddy -c "Add :IOKitPersonalities:Controller:IOPropertyMatch:LoadController bool true" $file
echo ":IOKitPersonalities:Controller:IOPropertyMatch added."

$usesudo /usr/libexec/PlistBuddy -c "Set :IOKitPersonalities:Controller:IOMatchCategory $newMatchCategory" $file
echo ":IOKitPersonalities:Controller:IOMatchCategory set to $newMatchCategory"

cacheupdate=true
fi
fi

if [ "$patchOS" = true ] && [ "$cacheupdate" = true ]; then
sudo touch /System/Library/Extensions
sudo kextcache -system-prelinked-kernel
fi

fi

else
echo "$file not found."
fi

else
echo "No proper action specified. Please use add/delete."
fi