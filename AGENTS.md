<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep question and schedule views mounted while switching study tabs so in-progress sessions are not discarded; existing browser-local storage behavior remains unchanged.
- Link schedule blocks to question filters through shared page state, without issuing an AI request until the student starts a batch.
- Shuffle alternatives once at bank delivery and remap the answer index so practice, audio and exam grading agree without mutating stored questions.
- Reserve complete simulados in one authenticated atomic database call; share subject pools and per-user seen IDs with individual practice, and never consume questions when an exam is incomplete.
- Premium payment is manual PIX (BR Code/EMV generated in src/lib/pix.ts from the owner's CNPJ key); access is granted by the admin via the /admin panel after confirming payment. Do not reintroduce the Stripe embedded checkout unless the user asks.
