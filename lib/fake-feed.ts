// Temporary test data for building the feed UI. Remove once real posts exist.

export type FeedPost = {
  id: string;
  author: string;
  date: string;
  likes: number;
  comments: number;
  title: string;
  description: string;
  cover?: string;
};

export const fakePosts: FeedPost[] = [
  {
    id: "1",
    author: "ნინო ბერიძე",
    date: "30 სექ.",
    likes: 1432,
    comments: 48,
    title: "როგორ ვისწავლე პროგრამირება ოცდაათი წლის ასაკში",
    description: "რა გამომივიდა, რა არა და რას შევცვლიდი, თავიდან რომ დამეწყო.",
    cover: "linear-gradient(135deg, #e0e7ff, #fce7f3)",
  },
  {
    id: "2",
    author: "გიორგი კაპანაძე",
    date: "28 სექ.",
    likes: 312,
    comments: 12,
    title: "თბილისის ძველი უბნები, რომლებიც ფეხით უნდა მოიაროთ",
    description: "სოლოლაკიდან ავლაბრამდე: მარშრუტი ერთი დღისთვის.",
    cover: "linear-gradient(135deg, #fef3c7, #fed7aa)",
  },
  {
    id: "3",
    author: "ანა ლომიძე",
    date: "27 სექ.",
    likes: 87,
    comments: 3,
    title: "რატომ არ მუშაობს ჩემი დღის გეგმა",
    description: "რამდენიმე მარტივი ცვლილება, რომელმაც დრო უკეთ დამაგეგმინა.",
  },
  {
    id: "4",
    author: "ნინო ბერიძე",
    date: "25 სექ.",
    likes: 2104,
    comments: 95,
    title: "TypeScript-ის ტიპები, რომლებიც ყოველდღე მჭირდება",
    description: "Partial, Pick, Record და კიდევ რამდენიმე, მაგალითებით.",
    cover: "linear-gradient(135deg, #dcfce7, #cffafe)",
  },
  {
    id: "5",
    author: "ლევან ჯაფარიძე",
    date: "22 სექ.",
    likes: 56,
    comments: 0,
    title: "ქართული ღვინის ქვევრი: როგორ მზადდება",
    description: "ვესაუბრე კახელ მეღვინეს, რომელიც ქვევრებს თავად აკეთებს.",
    cover: "linear-gradient(135deg, #f5f5f4, #e7e5e4)",
  },
  {
    id: "6",
    author: "გიორგი კაპანაძე",
    date: "20 სექ.",
    likes: 640,
    comments: 21,
    title: "ყაზბეგში ზამთარში: რა უნდა იცოდეთ წასვლამდე",
    description: "გზა, ტანსაცმელი, სად დარჩეთ და რა ღირს.",
    cover: "linear-gradient(135deg, #e0f2fe, #f1f5f9)",
  },
  {
    id: "7",
    author: "მარიამ წერეთელი",
    date: "18 სექ.",
    likes: 9,
    comments: 1,
    title: "წიგნები, რომლებიც ამ ზაფხულს წავიკითხე",
    description: "ხუთი წიგნი და მოკლედ, რატომ ღირს თითოეული.",
  },
  {
    id: "8",
    author: "ანა ლომიძე",
    date: "15 სექ.",
    likes: 1198,
    comments: 37,
    title: "როგორ დავიწყოთ სირბილი ტრავმის გარეშე",
    description: "პირველი რვა კვირის გეგმა დამწყებთათვის.",
    cover: "linear-gradient(135deg, #ede9fe, #e0e7ff)",
  },
];
