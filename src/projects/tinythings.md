# A Low‑Power ESP32 Moon Phase Display

This started as one of those projects that *should* be simple.

I wanted a small moon phase display I could stick on a shelf. Something that looked nice, didn’t need a backlight, didn’t depend on Wi‑Fi, and didn’t need me to think about it once it was built.

Of course, that meant I ended up thinking about it a lot.

This post is a walkthrough of how I built a low‑power moon phase display using an ESP32, a Waveshare e‑ink panel, and a battery‑backed RTC — and all the little details that turned out to matter.

---

## The Goal

The requirements were pretty straightforward:

* Update automatically
* Be accurate enough to trust
* Use almost no power
* Look good while doing nothing

I didn’t want something that woke up every minute, or needed Wi‑Fi all the time, or slowly drifted out of sync. Ideally, it would wake up a couple of times a day, update the display, and then disappear back into deep sleep.

That drove most of the design decisions.

---

## Hardware Choices

### ESP32

The ESP32 does very little work in this project, which is exactly why it works well:

* It has solid deep‑sleep support
* Wi‑Fi is available when I need it
* Plenty of flash for bitmap graphics

Most of the time, it’s completely off.

### DS3231 / DS3232 RTC

Rather than relying on ESP32 timers or Wi‑Fi time, I used a RTC.

The RTC:

* Keeps accurate time while the ESP32 sleeps
* Runs on a coin cell backup
* Can assert an interrupt to wake the ESP32

This means the ESP32 never has to guess when to wake up — the RTC tells it.

### 2.13" Waveshare E‑Ink Display

E‑ink was the obvious choice here:

* No power draw when the image is static
* High contrast
* Perfect for slow‑changing information

The downside is refresh complexity and speed, but when you’re only updating twice a day, that’s not a real problem.

---

## Power Model

The runtime behavior looks like this:

1. RTC alarm pulls a GPIO low
2. ESP32 wakes from deep sleep
3. Time is read from the RTC
4. Moon phase is calculated
5. Display is updated
6. Next alarm is scheduled
7. ESP32 goes back to sleep

No polling loops. No timers running in the background. The device is asleep almost all the time.

---

## Timekeeping and Recovery

The RTC is the source of truth for time — *unless it isn’t*.

If the backup battery dies or the clock stops, the RTC sets an Oscillator Stop Flag. On boot, I check that flag:

* If time is valid → keep going
* If time was lost → briefly enable Wi‑Fi, fetch NTP, reset the RTC, and shut Wi‑Fi back off

If NTP isn’t available, the device falls back to a known timestamp so it can still function.

Once time is restored, Wi‑Fi is disabled entirely.

---

## Moon Phase Math

This turned out to be more subtle than expected.

At first glance, moon phase seems simple: new, quarter, full, repeat. But there are two different concepts involved:

* **Phase**: where you are in the lunar cycle
* **Illumination**: how bright the moon appears

Phase progresses linearly over ~29.53 days. Illumination does not.

To get realistic results, I calculate phase as a fraction of the lunar cycle, then derive illumination using a cosine curve:

```
illumination = 0.5 × (1 − cos(2π × phase))
```

That produces the expected behavior:

* New Moon → 0%
* First Quarter → ~50%
* Full Moon → 100%
* Third Quarter → ~50%

Once I stopped treating illumination as linear, everything made sense.

---

## Displaying the Moon

Rather than trying to draw the moon procedurally, I went with pre‑rendered bitmap images:

* New Moon
* Waxing Crescent
* First Quarter
* Waxing Gibbous
* Full Moon
* Waning Gibbous
* Third Quarter
* Waning Crescent

Each image is a 1‑bit XBM stored in flash.

To keep things efficient:

* Images are tightly cropped
* Stored in `PROGMEM`
* Centered dynamically on the display

The e‑ink panel only has to update the pixels that matter.

---

## RTC‑Driven Wakeups

Instead of using ESP32 sleep timers, the RTC handles scheduling entirely.

An alarm is set for the next update (for example, 7:00 AM). When the alarm fires:

* The RTC pulls its interrupt pin low
* The ESP32 wakes
* The alarm is cleared and rescheduled

This avoids timer drift and makes sleep behavior extremely predictable.

---

## The End Result

The finished device:

* Updates twice per day
* Draws essentially zero power while idle
* Recovers automatically from time loss
* Displays an accurate moon phase and illumination

Once it’s running, it doesn’t need attention — which is exactly what I wanted.

---

## Takeaways

A few things this project reinforced for me:

* Let hardware handle timing when possible
* Always sanity‑check time structures
* Separate calculations from presentation
* E‑ink rewards simplicity

It’s a small project, but it does one thing well, quietly and efficiently.

And honestly, that’s the best kind of project.

🌙
