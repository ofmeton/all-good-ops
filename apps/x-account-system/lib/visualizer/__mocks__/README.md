# visualizer/__mocks__/

Phase 0.5 では codex-image.ts 自体が stub fallback を内蔵しているため、現状追加 mock 不要。

Phase 1+ で OpenAI SDK live path を追加する際に、SDK auto-mock を `openai.ts` 形式で本ディレクトリに配置する想定。jest.mock('openai') で auto-mock が拾われる。
