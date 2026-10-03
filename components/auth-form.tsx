"use client";

import { useState, type FormEvent } from "react";
import { FacebookIcon, GoogleIcon } from "./brand-icons";
import { Button } from "./button";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!emailPattern.test(email.trim())) {
      setError("შეიყვანე სწორი ელფოსტა");
      return;
    }
    // Sending the code comes with the backend.
  }

  return (
    <div className="flex flex-col gap-3">
      {/* OAuth links to /auth/google and /auth/facebook once the backend exists. */}
      <Button variant="outline" size="lg" className="w-full gap-3">
        <GoogleIcon />
        Google-ით გაგრძელება
      </Button>
      <Button variant="outline" size="lg" className="w-full gap-3">
        <FacebookIcon />
        Facebook-ით გაგრძელება
      </Button>

      <div className="my-3 flex items-center gap-4 text-sm text-muted">
        <span className="h-px flex-1 bg-line" />
        ან
        <span className="h-px flex-1 bg-line" />
      </div>

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-medium">
            ელფოსტა
          </label>
          <input
            id="email"
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            placeholder="name@example.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError("");
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "email-error" : undefined}
            className={`h-12 rounded-lg border bg-white px-4 text-base outline-offset-0 transition-colors placeholder:text-[#9a9a98] focus:border-ink ${
              error ? "border-[#d93025]" : "border-line"
            }`}
          />
          {error && (
            <p id="email-error" className="text-sm text-[#d93025]">
              {error}
            </p>
          )}
        </div>
        <Button type="submit" size="lg" className="w-full">
          კოდის გაგზავნა
        </Button>
      </form>

      <p className="mt-6 text-center text-sm leading-relaxed text-muted">
        გაგრძელებით ეთანხმები{" "}
        <span className="text-ink underline underline-offset-2">
          წესებსა
        </span>{" "}
        და{" "}
        <span className="text-ink underline underline-offset-2">
          კონფიდენციალურობის პოლიტიკას
        </span>
        .
      </p>
    </div>
  );
}
