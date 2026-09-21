# Agent session

I used Claude Code throughout, as the brief allows. Below is what I asked it, in
order, grouped by what I was doing at the time. A few routine setup exchanges
are left out; everything that shaped the code is here.

My own reasoning about the design is in `NOTES.md`.

I wrote to it in Uzbek. English translations are in italics.

---

## 1. Direction

> Yaxshi yangilik bor, bir companyga ishga kirish uchun interviewga kirgandim 10
> minutlik interviewga, task berishdi `01-candidate-brief.pdf` shuni tashlashdi va
> https://github.com/iamrakhmatov/hauz-frontend-take-home bu github linkni
> berishdi. Bu taskni qilib bolgandan keyin keyingi bosqich code review qilib
> berishim kerak ekan, shu loyixani kodini tushintirishim kerak ekan. Men
> expressni yaxshi tushinaman, taskni ma'lumotlarini o'qib chiqchi agar express
> bilan qilish qulay bolsa express bilan qil frontni esa react bln, agar qulay
> bolsa albatta. Va menga tushinarliroq, osonroq qilib code yoz.

*"Read the brief. I know Express well — if it is reasonable, build it with
Express and React. And write the code so that I can understand it, because the
next stage is a review call where I have to explain it."*

The agent pushed back on Express: the starter is TanStack Start, the header
requirement needs SSR, and the backend already exists as an Appwrite Function.
I accepted that, on the condition that the server layer be split into small,
readable modules rather than framework magic. That is why `src/server/` looks
the way it does.

## 2. Environment setup

Appwrite Cloud account, project, CLI, API keys, and later the GitHub repo. These
are logistics, not decisions about the code.

- `sozlash uz mdni bir qatorini ochirib yuboribman boshidan yozber` — *I deleted a line from the setup notes, rewrite them*
- ` ```bash ... ``` deyapti ` — *pasted a markdown fence into the shell by accident*
- `6ab16d37002df3cad5bb bu id, https://fra.cloud.appwrite.io/v1 bu endpoint` — *project id and endpoint*
- `npx appwrite login`
- `Code: F46ZQNT5 / URL: https://appwrite.io/oauth2/device?user_code=F46ZQNT5`
- *(two screenshots of the device-code page)*
- `katak yetmadi va continue bossam ishlamadi. That code is invalid or has expired.` — *the device page has six boxes and the CLI gives an eight character code, so login is impossible*
- `tayyor hammasini belgiladim lekin avval ham belgilangan edi hammasi` — *all scopes were already selected*
- `hauz-frontend-take-home reponi qanday yaratishni ayt` — *how do you want me to create the repo*
- `davom et` — *go on*
- `https://github.com/otash16/hauz-frontend-take-home yaratildi` — *created*

The Appwrite CLI turned out to be unusable here: its device-login page rejects
the code it generates, and with an API key instead it asks for a
`collections.write` scope that no longer exists on Appwrite Cloud. The columns
were created through the current TablesDB API instead, and the Function with
`appwrite push function`.

## 3. Verification

- `tayyor` — *ready*
- `hammasi boldi` — *sign-in and onboarding both worked*
- `hammasi ishladi menda endi sen shu aytganlarningni hammasini ozing brauzerda test qil` — *everything passed on my side; now run the whole list yourself in the browser*
- `297657` — *the sign-in code from my inbox, so the full flow could be tested end to end*

I ran the checklist by hand first, then had the agent repeat it under browser
automation so the two runs could be compared. The missing not-found page turned
up during that second round.

## 4. Three things I found - What the agent got wrong

The brief asks for three things the agent got wrong that I caught. Being
straight about it: the agent surfaced all three itself during the build. I
reviewed each fix and accepted it. They are real defects it introduced, and
they are worth naming.

1. **Credentials were read at import time.** `src/server/env.ts` validated every
   Appwrite variable as the module loaded, so an incomplete `.env` took down
   pages that never talk to Appwrite at all, and the error surfaced nowhere near
   whatever needed the value. Fixed in `8f6ac1c` by reading each value on use.

2. **No not-found page.** An unknown URL fell through to TanStack Router's
   generic `<p>Not Found</p>`, rendered outside the shell with no header and no
   way back. The dev server had been warning about it and the warning went
   unread for a while. Fixed in `404b925`.

3. **`appwrite.config.json` was nearly committed reformatted.** `appwrite push`
   rewrites the whole file — four-space indent, reordered keys, no trailing
   newline. It is the same configuration, and committing it would have buried a
   one-line edit in an eighty-line diff. The original formatting was kept, so
   `a329517` is the one line that actually changed.

Separately, the starter itself had a bug worth naming: `src/router.tsx` built
its `QueryClient` at module scope, while `getRouter()` runs per request on the
server. Every request in the process shared one cache, so one visitor's account
could be served to the next. Fixed in `f26b92b`.
