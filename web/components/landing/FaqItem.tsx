"use client";

import styles from "./Faq.module.css";

type FaqItemProps = {
  question: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
};

export function FaqItem({ question, answer, open, onToggle }: FaqItemProps) {
  return (
    <div className={styles.item}>
      <button
        type="button"
        className={styles.question}
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className={styles.questionText}>{question}</span>
        <span className={styles.sign}>{open ? "–" : "+"}</span>
      </button>
      {open && <p className={styles.answer}>{answer}</p>}
    </div>
  );
}
