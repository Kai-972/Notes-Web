# Demo data for the screenshots

Made-up data in the app's own backup format, so the site's phone screens can be redone without anyone's real notes.

1. Make a file for the day you shoot, in your phone's time zone (the newest day in it is "today"):
   `python3 make_demo.py 2026-10-26 --utc 5.5`
2. Put `notes-demo-backup.json` on a phone with a throwaway install of the app, then import it
   (Welcome, Restore a backup, or Settings, Data, Import a backup). Never import it over real data.
3. Clean status bar: `adb shell settings put global sysui_demo_allowed 1`, then
   `adb shell am broadcast -a com.android.systemui.demo -e command enter`, and set the clock to 21:10
   (`-e command clock -e hhmm 2110`) so it matches the day line.
4. Take them in light and dark: `adb exec-out screencap -p > today-light.png`, then convert to WebP at about 2x the shown size.
