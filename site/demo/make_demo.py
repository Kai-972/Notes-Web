#!/usr/bin/env python3
"""Makes the demo backup used for the site's screenshots: made-up data, in the exact format the app exports.

    python3 make_demo.py                      # "today" is today, the offset is this computer's
    python3 make_demo.py 2026-10-26 --utc 5.5

Import the file on a throwaway database (a fresh install, or Settings, Data, Import), then take the screenshots.
Run it on the day you shoot: the newest day in it is "today", so Today and Review look lived in.

Format: { format: 'notes-backup', formatVersion: 1, schemaVersion: 5, exportedAt, tables: { name: [rows] } }.
Days are 'YYYY-MM-DD' (logical days), moments are epoch milliseconds, notes keep time chips as {{HH:MM}}.
Nothing in here is real. Standard library only.
"""
import argparse
import json
import random
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

HISTORY_DAYS = 120

NOTES = [
    "Woke up slow, coffee first. Finally cracked the sliding window problem after trying brute force first.",
    "Gym, legs are gone. Stairs are going to hurt tomorrow.",
    "Read for an hour on the bus. The second half of the book is better than the first.",
    "Called home. Mum says the monsoon is late again.",
    "Bug in the parser, it was one missing case. Fixed, written a test, moving on.",
    "Tired. Skipped the evening walk, will do two tomorrow.",
    "Wrote the first draft of the post. It is bad, which is the point of a first draft.",
    "Lunch with A, then back to the bug. Good day overall.",
    "Rain all day. Stayed in, tidied the desk, cooked properly for once.",
    "Short day. Did the one thing that mattered and stopped.",
]
TASKS_DONE = ["Call the bank", "Renew the library card", "Reply to A", "Buy a new charger", "Book the dentist", "Pay the phone bill",
              "Send the form", "Fix the bike light", "Order the book", "Clean the desk", "Back up the laptop", "Water the plants"]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("today", nargs="?", default=date.today().isoformat(), help="the newest day, YYYY-MM-DD (default: today)")
    ap.add_argument("--utc", type=float, default=None, help="your phone's offset from UTC in hours, e.g. 5.5 (default: this computer's)")
    ap.add_argument("--out", default=str(Path(__file__).with_name("notes-demo-backup.json")))
    args = ap.parse_args()

    today = date.fromisoformat(args.today)
    offset = args.utc if args.utc is not None else datetime.now().astimezone().utcoffset().total_seconds() / 3600
    tz = timezone(timedelta(hours=offset))
    rnd = random.Random(2026)

    def ms(day: date, hh: int, mm: int = 0) -> int:
        return int(datetime(day.year, day.month, day.day, hh, mm, tzinfo=tz).timestamp() * 1000)

    key = lambda d: d.isoformat()
    first = today - timedelta(days=HISTORY_DAYS)
    days = [first + timedelta(days=i) for i in range(HISTORY_DAYS + 1)]
    past = days[:-1]

    goals = [  # the app's own colours: code is slot 0, fitness 1, reading 2, writing 3
        {"id": 1, "name": "writing", "color_slot": 3, "position": 0, "archived_at": None, "created_at": ms(first, 9)},
        {"id": 2, "name": "fitness", "color_slot": 1, "position": 1, "archived_at": None, "created_at": ms(first, 9)},
        {"id": 3, "name": "code", "color_slot": 0, "position": 2, "archived_at": None, "created_at": ms(first, 9)},
        {"id": 4, "name": "reading", "color_slot": 2, "position": 3, "archived_at": None, "created_at": ms(first, 9)},
    ]
    GOAL = {g["name"]: g["id"] for g in goals}

    def habit(i, name, goal, kind, target=None, unit=None):
        return {"id": i, "goal_id": GOAL[goal], "name": name, "kind": kind, "target": target, "unit": unit, "days_mask": 127,
                "remind_at": None, "position": i - 1, "start_day": key(first), "archived_at": None, "created_at": ms(first, 9)}
    habits = [habit(1, "Water", "fitness", "amount", 3, "L"), habit(2, "Code for an hour", "code", "check"),
              habit(3, "Read 20 pages", "reading", "check")]

    logs, moods, notes = [], [], []
    for d in past:
        stamp = ms(d, 20)
        if rnd.random() < 0.88:
            logs.append({"habit_id": 1, "day": key(d), "value": rnd.choice([1.5, 2, 2, 2.5, 2.5, 3, 3, 3.5]), "logged_at": stamp})
        if rnd.random() < 0.8:
            logs.append({"habit_id": 2, "day": key(d), "value": 1, "logged_at": stamp})
        if rnd.random() < 0.64:
            logs.append({"habit_id": 3, "day": key(d), "value": 1, "logged_at": stamp})
        if rnd.random() < 0.9:
            moods.append({"day": key(d), "level": rnd.choices([1, 2, 3, 4, 5], [3, 12, 30, 40, 15])[0], "logged_at": stamp})
        if rnd.random() < 0.3:
            body = "\n".join("{{%02d:%02d}} %s" % (h, m, rnd.choice(NOTES)) for h, m in sorted((rnd.randint(8, 22), rnd.choice([0, 12, 25, 40, 55])) for _ in range(rnd.randint(1, 2))))
            notes.append({"day": key(d), "body": body, "updated_at": ms(d, 22)})
    # today, as the site's screens show it: water on the way, code done, reading not yet, mood good, three entries
    logs += [{"habit_id": 1, "day": key(today), "value": 2.5, "logged_at": ms(today, 12)},
             {"habit_id": 2, "day": key(today), "value": 1, "logged_at": ms(today, 10, 25)}]
    moods.append({"day": key(today), "level": 4, "logged_at": ms(today, 9)})
    notes.append({"day": key(today), "updated_at": ms(today, 20), "body":
                  "{{07:40}} Woke up slow, coffee first.\n{{13:05}} Called the bank about the card, sorted.\n{{16:05}} Gym, legs are gone. Reading on the bus later."})

    tasks = []
    def task(title, goal=None, due=None, time=None, remind=None, repeat="never", done=None):
        t = {"id": len(tasks) + 1, "title": title, "goal_id": GOAL.get(goal) if goal else None, "due_day": key(due) if due else None,
             "due_time": time, "remind_offset_min": remind, "repeat": repeat, "done_at": None, "done_day": None,
             "position": len(tasks), "created_at": ms((due or today) - timedelta(days=3), 9), "next_id": None}
        if done:
            t["done_at"], t["done_day"] = done
        tasks.append(t)
    for d in rnd.sample(past[-60:], 18):
        task(rnd.choice(TASKS_DONE), due=d, done=(ms(d, rnd.randint(10, 19), rnd.choice([0, 15, 30, 45])), key(d)))
    task("Call the bank", due=today, time="13:00", remind=10, done=(ms(today, 13, 2), key(today)))
    task("Call home", due=today, time="21:00", remind=10)
    task("Reply to A", due=today)
    task("Take out the bins", due=today + timedelta(days=1), repeat="weekly")
    task("Write the parser tests", goal="code", due=today + timedelta(days=2))
    task("Book the dentist", due=today + timedelta(days=4), time="10:00", remind=60)

    focus = []
    def session(d, h1, m1, minutes, goal=None, task_id=None):
        start = ms(d, h1, m1)
        focus.append({"id": len(focus) + 1, "day": key(d), "started_at": start, "ended_at": start + minutes * 60000, "minutes": minutes,
                      "goal_id": GOAL.get(goal) if goal else None, "task_id": task_id})
    for d in rnd.sample(past[-45:], 20):
        session(d, rnd.randint(9, 18), rnd.choice([0, 15, 30]), rnd.choice([25, 25, 45, 50, 60]), rnd.choice(["code", "reading", "writing", None]))
    session(today, 9, 30, 50, "code")      # the day line's two bars: 09:30 to 10:20
    session(today, 18, 30, 45, "reading")  # and 18:30 to 19:15, so Day peek says 1 h 35 min

    settings = [{"key": k, "value": v} for k, v in
                [("name", "Kai"), ("mode", "system"), ("accent", "moss"), ("textSize", "M"), ("dayStart", "06:00"), ("lineEnd", "02:00"),
                 ("newDayAt", "04:00"), ("weekStart", "monday"), ("remindTasks", "1"), ("nudgeOn", "0"), ("nudgeAt", "21:30"),
                 ("onboarded", "1"), ("tipDismissed", "1")]]

    backup = {"format": "notes-backup", "formatVersion": 1, "schemaVersion": 5,
              "exportedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
              "tables": {"focus_sessions": focus, "goals": goals, "habit_logs": logs, "habits": habits, "moods": moods,
                         "notes": notes, "settings": settings, "tasks": tasks}}
    Path(args.out).write_text(json.dumps(backup, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{args.out}: {len(goals)} goals, {len(habits)} habits, {len(logs)} habit logs, {len(moods)} moods, {len(notes)} notes, "
          f"{len(tasks)} tasks, {len(focus)} focus sessions, ending {key(today)} (UTC{offset:+g})")


if __name__ == "__main__":
    main()
