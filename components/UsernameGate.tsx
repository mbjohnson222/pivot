"use client";

import { useEffect, useState } from "react";
import { setStoredString } from "@/lib/storage";

type Props = {
  username: string | null;
  onUsernameSet: (username: string) => void;
};

export default function UsernameGate({ username, onUsernameSet }: Props) {
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return localStorage.getItem("pivot-username") ?? "";
  });
  const [savedUsername, setSavedUsername] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return localStorage.getItem("pivot-username");
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (savedUsername) {
      onUsernameSet(savedUsername);
    }
  }, [onUsernameSet, savedUsername]);

  function save() {
    const trimmed = value.trim();

    if (trimmed.length < 3) {
      setMessage("Username must be at least 3 characters.");
      return;
    }

    void setStoredString("pivot-username", trimmed);
    setSavedUsername(trimmed);
    onUsernameSet(trimmed);
    setMessage("Username saved.");
  }

  if (username) {
    return null;
  }

  return (
    <div className="mb-6 flex flex-col items-center gap-3">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setMessage("");
          }}
          placeholder="Choose a username"
          className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-white outline-none"
        />
        <button
          onClick={save}
          className="rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-slate-950"
        >
          Save Username
        </button>
      </div>

      {savedUsername && (
        <div className="text-sm text-slate-300">
          Signed in as <span className="font-semibold text-cyan-300">{savedUsername}</span>
        </div>
      )}

      {message && <div className="text-sm text-amber-300">{message}</div>}
    </div>
  );
}
