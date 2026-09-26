/**
 * Test data for the home sidebar: `node --env-file=.env.local db/seed-sidebar.mts`.
 * Add `--remove` to delete it again.
 *
 * Unlike seed.mts this never touches existing accounts: everything it creates
 * belongs to users on @sidebar.test, and re-running replaces only those.
 */
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env.local first.');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to add test accounts while NODE_ENV is "production".');
  process.exit(1);
}

const sql = postgres(url, { max: 4, onnotice: () => {} });
const DOMAIN = '@sidebar.test';
const PASSWORD = 'password123';

type UserSeed = { key: string; name: string; bio: string; interests: string[] };

/** Authors, each writing in two topics, plus one reader who writes nothing. */
const USERS: UserSeed[] = [
  { key: 'luka', name: 'ლუკა მესხი', bio: 'ტექლიდი. ვწერ კოდის რევიუზე და გუნდებზე.', interests: ['engineering', 'career'] },
  { key: 'mariam', name: 'მარიამ გელაშვილი', bio: 'კინომცოდნე და ისტორიის მოყვარული.', interests: ['cinema', 'history'] },
  { key: 'dato', name: 'დათო კაპანაძე', bio: 'მოგზაური, ვწერ გზებზე და ადგილებზე.', interests: ['travel', 'writing'] },
  { key: 'eka', name: 'ეკა ჯავახიშვილი', bio: 'მასწავლებელი, ვასწავლი პროგრამირებას.', interests: ['education', 'engineering'] },
  { key: 'sandro', name: 'სანდრო ბაქრაძე', bio: 'მზარეული და მორბენალი.', interests: ['food', 'sports'] },
  { key: 'keti', name: 'ქეთი ნოზაძე', bio: 'ფინანსისტი, საღამოობით ჯაზი.', interests: ['finance', 'music'] },
  { key: 'reader', name: 'ტესტ მკითხველი', bio: '', interests: ['engineering', 'cinema', 'travel', 'history'] },
];

/** Who follows whom: followed authors must drop out of the suggestions. */
const FOLLOWS: [string, string][] = [['reader', 'luka']];

type PostSeed = {
  author: string;
  slug: string;
  title: string;
  subtitle: string;
  topics: string[];
  daysAgo: number;
  views: number;
  likes: number;
  comments: number;
  status?: 'draft';
  body: string;
};

const POSTS: PostSeed[] = [
  // luka: engineering, career
  { author: 'luka', slug: 'code-review', title: 'კოდის რევიუ, რომელიც გუნდს ასწავლის', subtitle: 'კომენტარი კითხვად და არა განაჩენად.', topics: ['engineering'], daysAgo: 1, views: 40, likes: 4, comments: 2,
    body: 'კარგი რევიუ ავტორს სვამს კითხვას, რომელზეც პასუხი თავად უნდა იპოვოს. ცუდი რევიუ უბრალოდ გადაწერს კოდს.' },
  { author: 'luka', slug: 'first-year-tech-lead', title: 'ჩემი პირველი წელი ტექლიდად', subtitle: 'ნაკლები კოდი, მეტი საუბარი და ერთი დიდი შეცდომა.', topics: ['career', 'engineering'], daysAgo: 5, views: 25, likes: 3, comments: 1,
    body: 'პირველ თვეებში ყველა რთულ ამოცანას თავად ვიღებდი. გუნდი ამით არაფერს სწავლობდა, მე კი ვიწვოდი.' },
  { author: 'luka', slug: 'incident-reports', title: 'როგორ ვწერ ინციდენტის ანგარიშს', subtitle: 'დამნაშავის ძებნის გარეშე და მაინც სასარგებლოდ.', topics: ['engineering', 'writing'], daysAgo: 12, views: 15, likes: 2, comments: 0,
    body: 'ანგარიში იწყება ქრონოლოგიით და მთავრდება ერთი ცვლილებით, რომელიც მეორედ იგივეს არ დაუშვებს.' },
  { author: 'luka', slug: 'junior-interviews', title: 'რას ვეძებ ჯუნიორის გასაუბრებაზე', subtitle: 'ცნობისმოყვარეობა სჯობს სწორ პასუხს.', topics: ['career'], daysAgo: 20, views: 18, likes: 2, comments: 1,
    body: 'კანდიდატი, რომელიც ამბობს „არ ვიცი, მაგრამ ასე შევამოწმებდი“, თითქმის ყოველთვის სჯობს ზეპირად ნასწავლ პასუხს.' },

  // mariam: cinema, history
  { author: 'mariam', slug: 'solaris', title: 'სოლარისი ორმოცდაათი წლის შემდეგ', subtitle: 'რატომ ბრუნდება ტარკოვსკი ყოველ თაობასთან.', topics: ['cinema'], daysAgo: 2, views: 35, likes: 4, comments: 2,
    body: 'ფილმი კოსმოსზე კი არა, მეხსიერებაზეა. ამიტომაც არ ბერდება.' },
  { author: 'mariam', slug: 'tbilisi-photos', title: 'თბილისი XIX საუკუნის ფოტოებში', subtitle: 'ქალაქი, რომელიც ჯერ კიდევ ცნობადია.', topics: ['history'], daysAgo: 9, views: 20, likes: 2, comments: 1,
    body: 'ერმაკოვის ფოტოებში ქუჩები იგივეა, ხალხი სხვა. ეს განსხვავება ყველაზე საინტერესოა.' },
  { author: 'mariam', slug: 'georgian-film', title: 'ქართული კინოს ოქროს ხანა', subtitle: 'სამოციანების ფილმები, რომლებიც დღესაც თანამედროვეა.', topics: ['cinema', 'history'], daysAgo: 15, views: 22, likes: 3, comments: 1,
    body: 'იოსელიანის და აბულაძის ფილმები ცენზურის პირობებში ახერხებდნენ იმის თქმას, რისი თქმაც არ შეიძლებოდა.' },
  { author: 'mariam', slug: 'festival-notes', title: 'ჩანაწერები კინოფესტივალიდან', subtitle: 'ხუთი დღე, თვრამეტი ფილმი და ერთი აღმოჩენა.', topics: ['cinema'], daysAgo: 25, views: 10, likes: 1, comments: 0,
    body: 'საუკეთესო ფილმი ყველაზე ცარიელ დარბაზში ვნახე, დილის ცხრა საათზე.' },
  { author: 'mariam', slug: 'series-draft', title: 'სერიალები, რომლებიც კინოზე უკეთესია', subtitle: 'მონახაზი.', topics: ['cinema'], daysAgo: 0, views: 0, likes: 0, comments: 0, status: 'draft',
    body: 'ჯერ სია არ დამისრულებია.' },

  // dato: travel, writing
  { author: 'dato', slug: 'svaneti-winter', title: 'სვანეთი ზამთარში: რა უნდა იცოდე', subtitle: 'გზა, ტანსაცმელი და სად გაჩერდე.', topics: ['travel'], daysAgo: 3, views: 30, likes: 3, comments: 1,
    body: 'მესტიამდე გზა ზამთარშიც ღიაა, მაგრამ უშგულამდე მხოლოდ ადგილობრივ მძღოლს ენდე.' },
  { author: 'dato', slug: 'travel-diary', title: 'სამოგზაურო დღიური', subtitle: 'რატომ ღირს ყოველ საღამოს ერთი გვერდის დაწერა.', topics: ['travel', 'writing'], daysAgo: 7, views: 12, likes: 1, comments: 0,
    body: 'ფოტოები გახსენებს, როგორ გამოიყურებოდა ადგილი. დღიური გახსენებს, რას გრძნობდი იქ.' },
  { author: 'dato', slug: 'tusheti-road', title: 'თუშეთის გზა პირველად', subtitle: 'ოთხი საათი, ორმოცი მოსახვევი და არც ერთი სინანული.', topics: ['travel'], daysAgo: 11, views: 26, likes: 3, comments: 2,
    body: 'აბანოს უღელტეხილზე გაჩერდი, თუნდაც ხუთი წუთით. იქიდან ხედი მთელ გზას ამართლებს.' },
  { author: 'dato', slug: 'slow-travel', title: 'ნელი მოგზაურობა', subtitle: 'ერთი ქალაქი, ორი კვირა, ნულოვანი გეგმა.', topics: ['travel'], daysAgo: 30, views: 9, likes: 1, comments: 0,
    body: 'მეორე კვირას ქალაქი ღირსშესანიშნაობების სიად აღარ გეჩვენება. ის უბრალოდ ადგილი ხდება, სადაც ცხოვრობ.' },

  // eka: education, engineering
  { author: 'eka', slug: 'teach-programming', title: 'პროგრამირების სწავლება სკოლაში', subtitle: 'რა მუშაობს მეცხრე კლასში და რა არა.', topics: ['education', 'engineering'], daysAgo: 4, views: 18, likes: 2, comments: 1,
    body: 'თამაშის აწყობა სჯობს სინტაქსის ლექციას. ცვლადები თავისით ხდება საჭირო, როცა ქულა უნდა დაითვალო.' },
  { author: 'eka', slug: 'exams', title: 'გამოცდები, რომლებიც სწავლას ზომავს', subtitle: 'დაიმახსოვრე ნაკლები, გაიგე მეტი.', topics: ['education'], daysAgo: 13, views: 14, likes: 1, comments: 1,
    body: 'ღია წიგნით გამოცდა ამოწმებს, შეუძლია თუ არა მოსწავლეს ცოდნის გამოყენება და არა მის გამეორებას.' },
  { author: 'eka', slug: 'sql-for-everyone', title: 'SQL ყველასთვის', subtitle: 'ერთი ენა, რომელიც ყველა პროფესიას გამოადგება.', topics: ['engineering', 'education'], daysAgo: 18, views: 20, likes: 2, comments: 0,
    body: 'ბუღალტერს, ჟურნალისტს და მასწავლებელს ერთნაირად სჭირდებათ კითხვის დასმა მონაცემებისთვის.' },
  // Older than the rail's 60-day window: must never appear there despite the likes.
  { author: 'eka', slug: 'leaving-orms', title: 'რატომ ვტოვებ ORM-ებს', subtitle: 'SQL-ის დამალვა მეტ პრობლემას ქმნის, ვიდრე წყვეტს.', topics: ['engineering'], daysAgo: 90, views: 80, likes: 5, comments: 3,
    body: 'ყოველი აბსტრაქცია ბოლოს ჟონავს. ORM-ის შემთხვევაში ეს წარმოების ბაზაზე ხდება, ღამის სამ საათზე.' },

  // sandro and keti: off every reader's topics, and the most popular posts on the site.
  { author: 'sandro', slug: 'khinkali', title: 'ხინკალი: ცომის მეცნიერება', subtitle: 'წყალი, ფქვილი და მოთმინება.', topics: ['food'], daysAgo: 1, views: 90, likes: 5, comments: 3,
    body: 'ცომი ნახევარი საათი უნდა დაისვენოს. ვინც ამას გამოტოვებს, ნაკეცებს ვერ გააკეთებს.' },
  { author: 'sandro', slug: 'mountain-marathon', title: 'მარათონისთვის მზადება მთაში', subtitle: 'სიმაღლე, ტემპი და ფეხსაცმელი.', topics: ['sports'], daysAgo: 2, views: 70, likes: 5, comments: 3,
    body: 'მთაში ტემპს ნუ უყურებ. უყურე პულსს და აღმართზე ფეხით სიარული სირცხვილი არ არის.' },
  { author: 'sandro', slug: 'supra-guide', title: 'სუფრის გზამკვლევი სტუმრისთვის', subtitle: 'სადღეგრძელოები, რიგი და როდის შეიძლება უარის თქმა.', topics: ['food'], daysAgo: 6, views: 50, likes: 4, comments: 2,
    body: 'თამადა სუფრის რიტმს აწყობს. სტუმრის საქმეა მოუსმინოს და არა ყველა ჭიქა ბოლომდე დალიოს.' },
  { author: 'keti', slug: 'first-portfolio', title: 'პირველი საინვესტიციო პორტფელი', subtitle: 'მცირე თანხით, დიდი ხმაურის გარეშე.', topics: ['finance'], daysAgo: 1, views: 85, likes: 5, comments: 3,
    body: 'ინდექსური ფონდი მოსაწყენია და სწორედ ამიტომ მუშაობს. აქციების არჩევა გართობაა, არა სტრატეგია.' },
  { author: 'keti', slug: 'tbilisi-jazz', title: 'ჯაზი თბილისში: სად მოვუსმინოთ', subtitle: 'ხუთი ადგილი პარასკევ საღამოსთვის.', topics: ['music'], daysAgo: 3, views: 60, likes: 4, comments: 2,
    body: 'საუკეთესო კონცერტები პატარა კლუბებშია, სადაც მუსიკოსი ორ მეტრშია და შესვენებაზე შენს მაგიდასთან ჯდება.' },
  { author: 'keti', slug: 'budget', title: 'ბიუჯეტი, რომელიც მართლა მუშაობს', subtitle: 'სამი კატეგორია, არა ოცდასამი.', topics: ['finance'], daysAgo: 8, views: 45, likes: 3, comments: 2,
    body: 'აუცილებელი, სასურველი და დანაზოგი. ყველაფერი დანარჩენი ცხრილია, რომელსაც მესამე კვირას მიატოვებ.' },
];

const COMMENTS = [
  'ზუსტად ეს მჭირდებოდა ამ კვირას.',
  'ბოლო აბზაცი ყველაზე ძლიერია.',
  'ამაზე გაგრძელება დაწერე, ძალიან საინტერესოა.',
  'ნაწილობრივ არ ვეთანხმები, მაგრამ კარგი არგუმენტია.',
  'შევინახე და გუნდს გავუზიარე.',
];

async function removeTestData() {
  const removed = await sql`delete from users where email like ${'%' + DOMAIN} returning id`;
  return removed.length;
}

async function main() {
  const removed = await removeTestData();
  if (process.argv.includes('--remove')) {
    console.log(`Removed ${removed} ${DOMAIN} accounts and everything they wrote.`);
    return;
  }

  const topicIds = new Map<string, string>();
  const topicRows = await sql<{ id: string; slug: string }[]>`select id, slug from topics where is_featured`;
  for (const row of topicRows) topicIds.set(row.slug, row.id);
  const missing = [...new Set([...USERS.flatMap((u) => u.interests), ...POSTS.flatMap((p) => p.topics)])].filter(
    (slug) => !topicIds.has(slug),
  );
  if (missing.length > 0) throw new Error(`Editorial topics missing (run npm run db:setup): ${missing.join(', ')}`);

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const userIds = new Map<string, string>();
  for (const u of USERS) {
    const [row] = await sql<{ id: string }[]>`
      insert into users (email, password_hash, name, username, bio, onboarded_at)
      values (${u.key + DOMAIN}, ${passwordHash}, ${u.name}, ${'sb_' + u.key}, ${u.bio}, now())
      returning id`;
    userIds.set(u.key, row.id);
    for (const slug of u.interests) {
      await sql`insert into topic_affinity (user_id, topic_id, score) values (${row.id}, ${topicIds.get(slug)!}, 8)`;
    }
  }

  for (const [follower, following] of FOLLOWS) {
    await sql`insert into follows (follower_id, following_id) values (${userIds.get(follower)!}, ${userIds.get(following)!})`;
  }

  const authors = USERS.filter((u) => POSTS.some((p) => p.author === u.key)).map((u) => u.key);
  for (const p of POSTS) {
    const id = randomUUID();
    const authorId = userIds.get(p.author)!;
    const published = p.status !== 'draft';
    const at = new Date(Date.now() - p.daysAgo * 86_400_000 - Math.floor(Math.random() * 3_600_000));

    await sql`
      insert into posts (id, author_id, slug, title, subtitle, content_html, content_text,
                         status, reading_minutes, published_at, created_at, updated_at)
      values (${id}, ${authorId}, ${`${p.slug}-${id.slice(0, 6)}`}, ${p.title}, ${p.subtitle},
              ${`<p>${p.body}</p>`}, ${p.body}, ${published ? 'published' : 'draft'}, 1,
              ${published ? at : null}, ${at}, ${at})`;
    for (const slug of p.topics) {
      await sql`insert into post_topics (post_id, topic_id) values (${id}, ${topicIds.get(slug)!})`;
    }
    if (!published) continue;

    // The counters on posts are kept by triggers, so engagement is real rows.
    for (let i = 0; i < p.views; i++) {
      await sql`
        insert into post_views (post_id, viewer_key, created_at)
        values (${id}, ${`v:sb-${randomUUID().slice(0, 12)}`}, ${at}::timestamptz + random() * (now() - ${at}::timestamptz))`;
    }
    const others = authors.filter((key) => key !== p.author);
    for (const key of others.slice(0, p.likes)) {
      await sql`insert into likes (post_id, user_id) values (${id}, ${userIds.get(key)!})`;
    }
    for (const [i, key] of others.slice(0, p.comments).entries()) {
      await sql`insert into comments (post_id, author_id, body) values (${id}, ${userIds.get(key)!}, ${COMMENTS[i % COMMENTS.length]})`;
    }
  }

  console.log(`Added ${USERS.length} accounts and ${POSTS.length} posts. Sign in with any of (password: ${PASSWORD}):`);
  for (const u of USERS) console.log(`  ${u.key + DOMAIN}  (${u.interests.join(', ')})`);
}

main()
  .then(() => sql.end())
  .catch(async (error) => {
    console.error(error);
    await sql.end();
    process.exit(1);
  });
