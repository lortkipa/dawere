"use client";

import { useState } from "react";
import { FaqItem } from "./FaqItem";
import styles from "./Faq.module.css";

const FAQ_ITEMS = [
  {
    question: "რითი განსხვავდება dawere სხვა პლატფორმებისგან?",
    answer:
      "სხვაგან სტატია მხოლოდ იკითხება, dawere-ზე მას კითხვასაც უსვამ. ყოველ სტატიაში ჩაშენებულია ხელოვნური ინტელექტი (AI), რომელიც სწორედ იმ ტექსტს იცნობს, რომელსაც კითხულობ: შეგიძლია სთხოვო შეჯამება, გაურკვეველი აბზაცის ახსნა ან კონტექსტი გვერდის დატოვების გარეშე.",
  },
  {
    question: "საიდან მოდის პასუხები?",
    answer:
      "მხოლოდ სტატიის ტექსტიდან და ავტორის მიერ დართული წყაროებიდან. dawere არაფერს იგონებს: თუ პასუხი ტექსტში არ არის, ის ამას პირდაპირ გეუბნება, ნაცვლად იმისა, რომ დამაჯერებელი სისულელე დაწეროს.",
  },
  {
    question: "რა სტატისტიკას იღებს ავტორი?",
    answer:
      "იმას, რასაც ჩვეულებრივი ბლოგი ვერასდროს მოგცემს. ნახვებისა და წაკითხვის გარდა, ავტორი ხედავს რეალურ კითხვებს, რომლებსაც მკითხველები AI-ს უსვამენ: რომელ აბზაცზე ჩერდებიან, რა დარჩა გაუგებარი და რა თემა აინტერესებთ ყველაზე მეტად. ეს კი პირდაპირი მინიშნებაა იმაზე, თუ რაზე დაწერო შემდეგი სტატია.",
  },
  // {
  //   question: "ავტორმა რა უნდა გააკეთოს დამატებით?",
  //   answer:
  //     "არაფერი. წერს ისე, როგორც ყოველთვის წერდა — ჩატი და შეჯამება გამოქვეყნებისთანავე თავისით ირთვება.",
  // },
  {
    question: "რა ღირს?",
    answer:
      "მკითხველისთვის სრულიად უფასოა. ავტორს კი შეუძლია ისარგებლოს უფასო საბაზისო გეგმით, რომელიც ბლოგის დასაწყებად სავსებით საკმარისია.",
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className={styles.section}>
      <hr className={styles.rule} />
      <div className={styles.inner}>
        <h2 className={styles.title}>ხშირად დასმული კითხვები</h2>
        <div className={styles.list}>
          {FAQ_ITEMS.map((item, index) => (
            <FaqItem
              key={item.question}
              question={item.question}
              answer={item.answer}
              open={openIndex === index}
              onToggle={() =>
                setOpenIndex((current) => (current === index ? null : index))
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
}
