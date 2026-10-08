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

- Keep homepage visual styling scoped to `.resort-home` and reusable reveal behavior in `src/components/home` so guest-site redesigns do not change staff panels.
- Homepage room names, rates and guest limits come from the existing rooms query; bundled concept photography is presentation only, never resort inventory data.
