<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/9f1d927a-6357-406a-afb3-dfa83405e613

## CMS UI Alignment

This prototype is being compared against the Theme 3 CMS UI design spec:

- Main spec: `../../docs/cms-ui-design.md`
- Update notes: `CMS_UI_ALIGNMENT_NOTES.md`

Use `CMS_UI_ALIGNMENT_NOTES.md` as the working checklist for the missing screens, state handling, theme export flow, CMS binding improvements, and visual cleanup needed before this prototype fully matches the target CMS UI.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
