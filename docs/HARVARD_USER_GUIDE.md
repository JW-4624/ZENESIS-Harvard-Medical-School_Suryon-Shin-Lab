# Harvard User Guide – Bioprinter Studio (Auto Slice)

This guide is for researchers at the Harvard Medical School Suryon Shin Lab who
use `JW-4624/ZENESIS-Harvard-Medical-School_Suryon-Shin-Lab`. It covers getting access, running the app on your
own computer, using Auto Slice, and (optionally) working on the code with your
own GitHub or Claude account.

- Repository: https://github.com/JW-4624/ZENESIS-Harvard-Medical-School_Suryon-Shin-Lab
- What Auto Slice does and the output format: [`AUTOSLICE.md`](../AUTOSLICE.md)

---

## 1. Get access

The repository is **private**. You need to be invited before you can see it.

1. Send your **GitHub username** (or the email of your GitHub account) to the
   repository owner (JW-4624).
2. The owner invites you at _Settings → Collaborators → Add people_.
3. Accept the invitation: open the email from GitHub, or go to
   https://github.com/JW-4624/ZENESIS-Harvard-Medical-School_Suryon-Shin-Lab/invitations while signed in.
4. Open the repository link above. If you see a 404, you are probably signed in to a
   different GitHub account than the one that was invited.

You don't have a GitHub account yet? Create a free one at https://github.com/signup
and send the new username to the owner.

> **For the repository owner:** this repository contains only the Auto Slice
> code, so collaborators see nothing else. Give **Read** access if people only
> need to run the tool, and **Write** if they will push changes.

---

## 2. Run Auto Slice on your computer

You only need this once per computer. Nothing is uploaded anywhere; slicing runs
in your browser.

### 2.1 Install the tools

| Tool              | Version                                | Get it                                               |
| ----------------- | -------------------------------------- | ---------------------------------------------------- |
| Git               | any recent                             | https://git-scm.com/downloads                        |
| Node.js           | **22.12 or newer** (20.19+ also works) | https://nodejs.org                                   |
| Bun (recommended) | any recent                             | https://bun.sh – or use `npm`, which comes with Node |
| Browser           | **Chrome or Edge**                     | needed to save straight into a folder                |

Check your versions in a terminal (Terminal on macOS, PowerShell on Windows):

```bash
git --version
node --version
```

### 2.2 Download the branch

```bash
git clone https://github.com/JW-4624/ZENESIS-Harvard-Medical-School_Suryon-Shin-Lab.git
cd ZENESIS-Harvard-Medical-School_Suryon-Shin-Lab
```

Git asks you to sign in. Use your GitHub username and a **personal access
token** as the password (GitHub → Settings → Developer settings → Personal
access tokens → _Fine-grained tokens_, repository access to
`JW-4624/ZENESIS-Harvard-Medical-School_Suryon-Shin-Lab`, permission _Contents: Read_). GitHub Desktop or
`gh auth login` also work if you prefer a login window.

### 2.3 Start it

```bash
bun install        # or: npm install
bun run dev        # or: npm run dev
```

Open **http://localhost:8080** and choose **Auto Slice** in the left menu
(or go straight to http://localhost:8080/autoslice). Leave the terminal window
open while you work; press `Ctrl+C` in it to stop.

### 2.4 Get updates later

```bash
cd ZENESIS-Harvard-Medical-School_Suryon-Shin-Lab
git pull
bun install        # only needed if dependencies changed
bun run dev
```

---

## 3. Use Auto Slice

1. **Format** – click 1 well, 2 well, 4 well, 8 well, or Slide glass. All formats
   use the 75 × 25 mm slide footprint. Well sizes are nominal; if your chamber
   slide is different, open _Adjust well size_ and enter your own values.
2. **Design** – choose one:
   - **STL file** – drag the file in. Units are read as millimetres, Z is up,
     and the mesh should be closed (watertight).
   - **2D image** – PNG, JPG or SVG, extruded to the thickness you enter. Dark
     pixels are material; switch the toggle for light artwork on a dark background.
   - **Built-in shape** – disc, rectangle or lattice with sizes you type in.
3. **Placement** – the same design is centred in every selected well. Click wells
   in the preview to include or skip them. _Fit to well_ scales the design to fit
   the smallest selected well; _Actual size_ keeps your dimensions and warns if
   the design is larger than a well.
4. **Slicing & output** – choose layer height and pixel size, and whether you
   want one full-slide image per layer, one image per well, or both. Set the
   output folder name.
5. **Light intensity** – type the intensity you want, e.g. `3.7`, `3.7mW` or
   `3.7 mW/cm²`. The page shows the value to enter on the machine
   (3.7 mW/cm² → **118** or 119). The result is also saved in the output folder.
6. Check the layer preview with the slider on the right, then click
   **Generate to folder** (Chrome / Edge: pick where to save) or **Download ZIP**
   (any browser; unzip afterwards).

### What you get

```
<folder name>/
  manifest.json               format, wells, layer height, pixel size, light setting
  README.txt
  plate/layer_00001.png …     full 75 × 25 mm mask, all selected wells
  wells/A1/layer_00001.png …  optional: one cropped mask per well
```

PNG, 8-bit grayscale. White (255) is exposed, black (0) stays dark. Images are
viewed from above with the origin at the top-left.

### About the light-intensity values

The conversion uses the inspection data of **one machine**: ZENESIS
ZNS-6200626-BFAP01, 385 nm, inspected 2026-07-02. **If your machine is a different
unit, the setting shown may not be correct for it.** Send the owner that
machine's UV inspection sheet to have it added.

- Measured range is 2.5–26 mW/cm². Values outside it are marked as extrapolated.
- Below about 10 mW/cm² the fit and the raw readings can differ noticeably
  (example: 5.5 mW/cm² → 167 by the fit, 174 by the sheet's direct readings).
  The page shows a warning when this happens. Check with a power meter before
  an experiment that depends on the exact intensity.

---

## 4. Work on the code with your own account (optional)

You only need this section if you want to change the tool. Everyone else can stop
at section 3.

**Do not commit directly to `main`.** Work on your own branch and
send it back through a pull request so the owner can review it.

### 4.1 With GitHub

If you were invited with **Write** access:

```bash
git checkout main
git pull
git checkout -b harvard/<your-name>-<short-topic>
# make changes, then
git add -A
git commit -m "Describe what you changed"
git push -u origin harvard/<your-name>-<short-topic>
```

Then open GitHub and click **Compare & pull request**. Keep the **base branch
as `main`**.

With **Read** access only, click **Fork** on the repository page, push your branch
to your fork, and open the pull request from there.

### 4.2 With your own Claude account

You can ask Claude to make changes for you instead of editing code by hand. Your
Claude account must be able to see the repository, so complete section 1 first.

**Claude Code on the web (no install)**

1. Sign in at https://claude.ai/code with your own Claude account.
2. Connect your GitHub account when asked, and allow the Claude GitHub app on
   `JW-4624/ZENESIS-Harvard-Medical-School_Suryon-Shin-Lab`. If the repository is not listed, ask the owner
   to grant the app access to it (https://github.com/apps/claude/installations/select_target).
3. Start a new session, select the repository, and keep the branch
   **`main`**.
4. Describe the change in plain language, for example _"Add a 6-well format"_ or
   _"Add the UV calibration for our machine from this inspection sheet."_
5. Ask Claude to put its work on **a new branch** and open a pull request into
   `main`.

**Claude Code in the terminal**

```bash
git clone https://github.com/JW-4624/ZENESIS-Harvard-Medical-School_Suryon-Shin-Lab.git
cd ZENESIS-Harvard-Medical-School_Suryon-Shin-Lab
claude
```

Install Claude Code first (https://claude.com/claude-code) and sign in with your
own Claude account the first time it starts. Ask it to work on a new branch, as
above.

Whichever way you work, run `bun run dev` and try the change in the browser
before you ask the owner to merge it.

---

## 5. Troubleshooting

| Problem                                                    | What to do                                                                                                         |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 404 on the repository or branch link                       | You are not signed in with the invited GitHub account, or the invitation has not been accepted yet (section 1).    |
| `git clone` asks for a password and rejects it             | Use a personal access token, not your GitHub password (section 2.2).                                               |
| `node` is too old / install errors                         | Install Node 22.12 or newer and run `bun install` again.                                                           |
| Page not reachable at localhost:8080                       | The dev server is not running, or another program uses that port. Look at the terminal for the address it printed. |
| "Generate to folder" is greyed out                         | Your browser cannot write to folders. Use Chrome or Edge, or use **Download ZIP**.                                 |
| "The design is larger than well …"                         | Choose _Fit to well_ or lower the scale. The design is clipped otherwise.                                          |
| "Pixel size is too small" / "Too many layers"              | Increase the pixel size or the layer height.                                                                       |
| STL slices look wrong or have holes                        | The mesh is probably not closed. Repair it in your CAD / mesh tool and export again.                               |
| Light setting says "outside what this machine can produce" | The intensity is below about 1.1 or above about 28.6 mW/cm² for this machine's range.                              |

Questions or bugs: open an issue on the repository, or contact the owner.
