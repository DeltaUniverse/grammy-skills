# Rich Media Slideshow Bot (<tg-slideshow> + Buttons)

An example Telegram bot demonstrating **Rich Messages**, **Media Slideshows (`<tg-slideshow>`)**, **Collages (`<tg-collage>`)**, and **Embedded Buttons (`<tg-button>`)** using **grammY** (`v1.46.0`) and **Telegram Bot API 10.1–10.3**.

---

## 💡 Why `<tg-slideshow>` Instead of `sendMediaGroup`?

Telegram's conventional `sendMediaGroup` method **does not support inline keyboards/buttons** (`reply_markup`). Attempting to pass buttons to `sendMediaGroup` results in API errors.

With **Telegram Bot API 10.1–10.3 Rich Messages**, you can combine media albums with interactive buttons seamlessly:

```markdown
<tg-slideshow>

![](https://example.com/photo1.jpg "Slide 1")
![](https://example.com/photo2.jpg "Slide 2")

</tg-slideshow>

<tg-button-row align="center">
  <tg-button type="callback_data" style="primary" data="action:book">🎟️ Book</tg-button>
  <tg-button type="url" url="https://t.me/channel">📢 Channel</tg-button>
</tg-button-row>
```

---

## ⚡ Quick Test (Without Bot Token)

Run the offline simulation:

```bash
npm test
```

---

## 🚀 Live Run with Real Telegram Bot

### Step 1: Configure Token
```bash
cp .env.example .env
# Edit .env and enter your BOT_TOKEN from @BotFather
```

### Step 2: Install and Start
```bash
npm install
npm start
```

### Step 3: Test Commands
- `/slideshow` - Media album swiper with interactive action buttons.
- `/collage` - Photo collage tile grid with voting buttons.
