"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "20px",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>
            エラーが発生しました
          </h1>
          <p style={{ color: "#666", marginBottom: "24px" }}>
            申し訳ございません。予期しないエラーが発生しました。
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "12px 24px",
              backgroundColor: "#000",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            もう一度試す
          </button>
        </div>
      </body>
    </html>
  );
}
