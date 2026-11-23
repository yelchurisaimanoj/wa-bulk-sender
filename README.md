# WA Bulk Sender

A Chrome extension that sends WhatsApp messages in bulk from **WhatsApp Web**. Paste mobile numbers and group names (comma separated), write one message, press Start. It also exports every group and channel you have to CSV or JSON.

Everything runs inside your own browser. Nothing is uploaded to any server.

## Watch how to use it

![Demo](docs/demo.gif)

Full video with captions: [docs/demo.mp4](docs/demo.mp4) (1 min 38 s, recorded with version 1.0; the panel is now smaller and movable). It shows installing the extension, sending to two numbers and two groups, and exporting the group list.

> The video uses a practice page that looks like WhatsApp Web, so no real person was messaged while recording. On your own computer you use the real web.whatsapp.com.

## Read this first: keep your number safe

WhatsApp does not allow spam and can restrict or ban numbers that send unwanted bulk messages. This tool adds random pauses and limits, but it cannot make unwanted messages safe.

- Message only people who know you and expect to hear from you (your own clients, your own groups).
- Start small: 10 to 20 messages a day for the first week. Keep volumes modest after that.
- Keep the delays on. The default is a random 4 to 9 seconds between messages with a short break every 40. Use the "Careful" preset (8 to 18 seconds) for bigger lists, and avoid "Fast" except for a handful of people.
- Add an opt-out line such as "Reply STOP to skip reminders", and put anyone who opts out in the **Lists > Do not message** box.
- If WhatsApp shows a warning or messages stop going through, stop and wait a day.
- This is not an official WhatsApp product. Using it is at your own risk.

## Install (2 minutes)

Works on Chrome, Edge, Brave on a computer (not on phones).

1. Download this project: on GitHub press the green **Code** button, then **Download ZIP**, and unzip it. (Or `git clone` it.)
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and choose the **`extension`** folder inside the project.
5. Optional: click the puzzle-piece icon in Chrome and pin **WA Bulk Sender**.
6. Open https://web.whatsapp.com and log in by scanning the QR code with your phone, as usual. If it was already open, reload the tab once.

## Use it

Open the panel with the small green **✉** button on the right edge of WhatsApp Web, or by clicking the extension icon in the toolbar.

The panel floats over WhatsApp Web and never takes the whole screen: drag it by its title bar, press **—** (or double-click the title) to shrink it to a small bar with Pause/Resume/Stop, or **✕** to hide it (a running send keeps going). It shrinks by itself when you press Start.

### Send tab

1. **Mobile numbers**: comma separated, for example `9876500001, 919876543210, +14155550123`. Numbers without a country code get the default code (91 for India, change it in the small box). Spaces and dashes are fine. Duplicates and invalid entries are cleaned up and counted for you.
2. **CSV import** (optional): a file with a header row. The phone column can be called `phone`, `mobile`, `number` or `whatsapp`. Every other column becomes a variable you can use in the message. See `samples/clients-sample.csv`.
3. **Group names**: comma separated, exactly as they appear in WhatsApp, for example `Family, Clients Batch A`. If two chats share the exact same name the group is skipped instead of guessing. Tick "Allow a partial name" only if you want a unique partial match to count.
4. **Message**: write it once. Use placeholders:
   - `{name}`, `{first_name}`, `{number}`, and any CSV column such as `{account}`, `{amount}`, `{due_date}`
   - `{name|there}` means "use the name, or `there` if the name is empty"
   - A live preview shows the first message exactly as it will go out.
5. **Image** (optional, experimental): attaches one image and uses the message as caption.
6. **Safety**: pick Careful, Normal or Fast, or set your own delay range (minimum 2 seconds), break length and "max messages this run". You can also set a start time. Keep the tab open until then.
7. **Preview list** shows who will get the message and a rough time. **Start sending** asks you to confirm.

While it runs you can **Pause**, **Resume** or **Stop**. Failures (number not on WhatsApp, group not found, send not confirmed) are listed with the reason. **Retry failed** tries only those again. **Download results** saves a CSV report.

Three failures in a row pause the run automatically, so a logged-out session or a WhatsApp warning does not burn through your list.

Keep the WhatsApp Web tab open, your computer awake and your phone online while a run is going. Closing the tab pauses the run; reopening WhatsApp Web continues it.

### Groups tab

- **Load groups & channels** lists every group, community and channel in your account, with member counts.
- **Download CSV / JSON** saves the whole list.
- Tick groups and press **Add selected groups to send list** to message them.
- **Download members of selected** exports the phone numbers of the members of the groups you tick (groups only, and only members WhatsApp Web already knows about).

### Lists tab

- **Do not message**: numbers that are always skipped.
- **Saved recipient lists**: save and reload a set of numbers and groups (for example "March reminders").
- Message templates are saved from the Send tab with **Save**.

### Example for RD clients

Template:

```
Namaste {name|Sir/Madam}, your Post Office RD (A/c {account}) installment of Rs {amount} is due by {due_date}. Reply STOP to skip reminders. - Manoj, India Post agent
```

Import a CSV with `phone,name,account,amount,due_date`, check the preview, send with the Normal preset.

Keep real client lists on your computer only. Do not commit them to a public repository.

## How it works

- Numbers are opened inside the running WhatsApp Web page, with no reload: first with WhatsApp's own open-chat command, then by searching the number in the chat list. Only if both fail does it fall back to the click-to-chat link (`web.whatsapp.com/send?phone=...`), which reloads the page. In the no-reload mode a number that is not on WhatsApp is not detected up front, so check the chat if a message shows one grey tick.
- Groups are found by typing the name into WhatsApp Web's search box and opening the exact match.
- The group and channel list is read from WhatsApp Web's in-memory chat list (read-only). If that is not reachable after a WhatsApp update, it falls back to scrolling the visible chat list, and types then show as `chat`.
- The run queue is saved in the browser, so a reload or a crash never sends the same message twice. If the page reloads at the exact moment of pressing Send, that entry is marked `unknown` for you to check manually.

## Limits and honest notes

- WhatsApp changes its web page often. The extension tries several selectors for each part, but an update can still break a step. If a step stops working, open an issue with a screenshot.
- Sending images and reading channel lists depend most on WhatsApp's internals and are the most likely to need a fix.
- Tested here against a local stand-in page for WhatsApp Web (see below), not against a live WhatsApp account. Test with your own number first.

## Tests

`tests/` has a mock WhatsApp Web page and an end-to-end script (Puppeteer driving Chrome with the extension loaded):

```
cd tests && npm i puppeteer-core
sh make-testbuild.sh          # copies the extension and also allows the mock page on localhost:8099
node run-tests.mjs            # 17 checks: number parsing, send to numbers and groups with no page reload, CSV personalisation, exports
NOMODS=1 node run-tests.mjs   # same checks through the reload fallback
```

## Files

```
extension/        the Chrome extension (Manifest V3), load this folder
  manifest.json
  background.js          toolbar icon
  content/util.js        parsing, templates, CSV
  content/wa.js          WhatsApp Web page helpers and selectors
  content/runner.js      send queue, delays, retry
  content/panel.js       the panel
  content/bridge.js      read-only access to the chat list for export
samples/clients-sample.csv
docs/demo.mp4, demo.gif, screenshots
tests/
```
