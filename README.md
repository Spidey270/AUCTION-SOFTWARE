# AUCTION COMMAND // Tactical War Room & Tournament Platform

A high-performance desktop application designed for **college and tournament sports auctions** (IPL Cricket, European Football, and custom competitions), equipped with **Google Gemini 2.5 Flash** for intelligent sheet reading, rule extraction, and live bidding game theory.

---

##  What's New in v2.5

### 1. Mission Control Homepage
* Manage multiple saved tournaments and mock auctions.
* View live status: Squad progress, purse spent, cumulative ratings, and date created.
* Single-click **"Enter War Room"** to resume any active tournament.

### 2. 4-Step "New Auction Wizard"
* **Step 1: Tournament Identity & Sport Format** (Cricket / IPL or European Football).
* **Step 2: AI Rule Extractor** 
  * Paste the raw WhatsApp text or competition brochure rules, and **Gemini 2.5 Flash** automatically configures purse budgets, squad minimums, and foreign caps.
* **Step 3: AI-Powered Player List Importer**
  * Drop any messy Excel (.xlsx) or CSV file provided by organizers.
  * Gemini AI parses non-standard column headers, standardizes positions, handles overseas flags, and imputes missing ratings.
* **Step 4: Competitor Radar Setup**
  * Add the rival college teams competing in your auction.

### 3. Live AI Auction Strategist ("JARVIS for Auctions")
* **Real-time Tactical Queries:**
  * **Should I Bid?** Evaluates player value vs current bid vs remaining purse vs squad fit.
  * **Trap Rival?** Detects if opposing teams have weak budgets or desperation needs for this role.
  * **Fallback Targets:** Identifies top 3 alternative players if you let the current player go.
  * **Squad Gap Analysis:** Pinpoints missing roster categories and overseas limits.
* **Custom Tactical Chat:** Type any question to the AI strategist during intense bidding wars.

### 4. The "Never Get Disqualified" Safe Bid Lock
* Dynamically calculates your mathematical ceiling:
  $$\text{Max Safe Bid} = \text{Purse Remaining} - (\text{Empty Mandatory Slots} - 1) \times \text{Base Price}$$
* Triggers a hard lock and Red Alert if a bid would make it impossible to legally fill your roster.

### 5. Auction Plan, Live Focus & Post-Auction Review
* Set a role-by-role squad blueprint, planned purse ceiling, and custom bid increments before bidding.
* Star players in the market to create a target board with a priority and personal walk-away price.
* During bidding, see role gaps, budget pace, a suggested next nomination, rival threats, and available role alternatives.
* Use **Auction Focus Mode** to hide supporting panels, and add an optional note to each recorded outcome.
* Create a separate **Practice** copy, then review the full outcome log, plan-versus-result summary, value estimates, and hypothetical purchases.
* Undo the latest change or restore to a recent checkpoint from the review panel.

---

##  AI Configuration (Gemini 2.5 Flash)
* Click **"Configure Gemini AI Key"** in the top bar or header.
* Paste your key from [Google AI Studio](https://aistudio.google.com/app/apikey).
* Test connection with 1 click. Key is saved locally on your device.
* *Note:* If no key is set, the software operates using intelligent offline heuristics with zero downtime.

---

##  Tactical Speed Keys
| Key | Action |
|---|---|
| `/` | Instant search & filter players |
| `W` or `Enter` | Record the current displayed bid as won by me |
| `R` | Record the current displayed bid as sold to selected rival |
| `U` | Mark player Unsold |
| `1`, `2`, `3`, `4` | Raise the displayed bid by the configured increment |
| `A` | Toggle AI Strategist drawer |
| `N` | Select the next available player |
| `?` | Keyboard shortcuts cheat sheet |

Bid increments can be changed in the **Plan** panel. Keyboard actions are disabled while a modal or the AI drawer is open.

---

## Desktop App (Windows)
Auction Desk can run as a standalone Windows application. It stores tournament data locally in the app's browser storage.

* For development, run `npm run app:dev`.
* To create a Windows installer, run `npm run app:build`.
* The installer and unpacked app are written to `release/`. The installer creates Start Menu and optional Desktop shortcuts.
* Install once, then open **Auction Desk** like any other desktop app; Node.js is not required on the machine where the packaged app is installed.

`npm run dev` remains available for browser development.
