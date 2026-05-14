import "@testing-library/jest-dom/vitest";
import { config } from "dotenv";

// DBを使うテスト（Task 6 以降）が .env.local の Supabase 接続情報を読めるようにする。
config({ path: ".env.local" });
