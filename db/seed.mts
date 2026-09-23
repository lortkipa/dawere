/**
 * Demo data for local development: `npm run db:seed`.
 * Wipes user-generated content and rebuilds a small, believable community.
 */
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env.local first.');
  process.exit(1);
}

// This script deletes every account and post. Refuse to point it at a live
// site unless someone says so in as many words.
if (process.env.NODE_ENV === 'production' && !process.argv.includes('--yes-wipe-production')) {
  console.error(
    'Refusing to seed: NODE_ENV is "production" and seeding deletes every user and post.\n' +
      'If this really is a throwaway database, re-run with --yes-wipe-production.',
  );
  process.exit(1);
}

const sql = postgres(url, { max: 4, onnotice: () => {} });

/**
 * Tags the demo posts use. The editorial ones (engineering, design, …) already
 * exist from db/schema.sql and are only looked up; the rest are the kind of
 * one-off tags writers invent, created here without the featured flag.
 */
const TOPICS = [
  ['engineering', 'ინჟინერია', ''],
  ['design', 'დიზაინი', ''],
  ['product', 'პროდუქტი', ''],
  ['ai', 'ხელოვნური ინტელექტი', ''],
  ['startups', 'სტარტაპები', ''],
  ['career', 'კარიერა', ''],
  ['writing', 'წერა', ''],
  ['science', 'მეცნიერება', ''],
  ['health', 'ჯანმრთელობა', ''],
  ['finance', 'ფინანსები', ''],
  ['travel', 'მოგზაურობა', ''],
  ['food', 'საკვები', ''],
  ['databases', 'მონაცემთა ბაზები', 'შენახვის ძრავები, მოთხოვნების დამგეგმავი და მდგრადობა.'],
  ['css', 'CSS', 'განლაგება, კასკადი და თანამედროვე ბრაუზერი.'],
  ['typescript', 'TypeScript', 'ტიპები, რომლებიც ხაზს იჭერენ.'],
  ['photography', 'ფოტოგრაფია', 'სინათლე, კომპოზიცია და იმის ცოდნა, როდის დააჭირო ღილაკს.'],
] as const;

const USERS = [
  {
    email: 'nino@dawere.test',
    name: 'ნინო აბაშიძე',
    username: 'nino',
    bio: 'წამყვანი ინჟინერი. ვწერ მონაცემთა ბაზებზე, შეყოვნებაზე და სტეკის იმ ნაწილებზე, რომლებზეც არავინ იღებს ნებაყოფლობით პასუხისმგებლობას.',
    location: 'თბილისი',
    website: 'https://magaliti.ge',
  },
  {
    email: 'giorgi@dawere.test',
    name: 'გიორგი ქავთარაძე',
    username: 'giorgi',
    bio: 'დიზაინერი. მაინტერესებს ტიპოგრაფია, თავშეკავება და ინტერფეისები, რომლებიც გზიდან ეცლებიან.',
    location: 'ბათუმი',
    website: '',
  },
  {
    email: 'tamar@dawere.test',
    name: 'თამარ ლომიძე',
    username: 'tamar',
    bio: 'პროდუქტის ხელმძღვანელი. ყოფილი დამფუძნებელი. ვიწერ იმას, რაც მინდოდა, ვინმეს ადრე ეთქვა ჩემთვის.',
    location: 'ქუთაისი',
    website: '',
  },
  {
    email: 'levan@dawere.test',
    name: 'ლევან ჩხეიძე',
    username: 'levan',
    bio: 'მკვლევარი, ვმუშაობ შეფასების მეთოდებზე. ზოგჯერ ვწერ ესეებს კითხვასა და ყურადღებაზე.',
    location: 'თბილისი',
    website: '',
  },
  {
    email: 'ana@dawere.test',
    name: 'ანა ბერიძე',
    username: 'ana',
    bio: 'მზარეული, მორბენალი და უნებლიე ცხრილების მოყვარული.',
    location: 'თელავი',
    website: '',
  },
];

type PostSeed = {
  author: string;
  title: string;
  subtitle: string;
  topics: string[];
  daysAgo: number;
  status?: 'draft' | 'published';
  body: string;
};

const POSTS: PostSeed[] = [
  {
    author: 'nino',
    title: 'Postgres-ის სრული ტექსტის ძიება უკეთესია, ვიდრე გახსოვს',
    subtitle: 'სავარაუდოდ, ცალკე საძიებო კლასტერი ჯერ არ გჭირდება.',
    topics: ['engineering', 'databases'],
    daysAgo: 2,
    body: `<p>ყველა გუნდი ადრე თუ გვიან მიდის იმ წერტილამდე, სადაც <code>ILIKE '%ტერმინი%'</code> სასაცილო აღარაა. პირველი ინსტინქტია, ხელი სპეციალიზებულ საძიებო სერვისს სტაცო. სანამ ამას გააკეთებ, ღირს იცოდე, რამდენს გაძლევს Postgres უფასოდ.</p>
<h2>სამი შემადგენელი</h2>
<p>საწარმოო დონის ძიება Postgres-ში სინამდვილეში სამი ერთმანეთთან თანამშრომლური იდეაა და სამივე გჭირდება.</p>
<ul><li><strong>tsvector სვეტი</strong>, გენერირებული და შენახული, რომ დამუშავების ფასი ერთხელ, ჩაწერისას გადაიხადო.</li><li><strong>GIN ინდექსი</strong> ამ სვეტზე, რომ ძებნა ლოგარითმული დარჩეს ცხრილის ზრდისასაც.</li><li><strong>ტრიგრამული მსგავსება</strong> იმ მოთხოვნებისთვის, რომლებსაც სრული ტექსტის ძიება ვერასდროს დაიჭერს — მაგალითად, შეცდომით აკრეფილი სიტყვები.</li></ul>
<h2>წონები რანჟირებაზე მეტად მნიშვნელოვანია</h2>
<p>ყველაზე დიდი ეფექტის მომტანი ერთი ცვლილება <code>setweight</code>-ია. სათაურში დამთხვევა და მეცხრე აბზაცში დამთხვევა ერთი და იგივე არაა და თუ ამას ბაზას არ ეტყვი, მან ეს ვერ იცის.</p>
<pre><code>setweight(to_tsvector('simple', title), 'A') ||
setweight(to_tsvector('simple', body), 'C')</code></pre>
<blockquote><p>რელევანტურობა პროდუქტის გადაწყვეტილებაა, რომელსაც ბაზის კოსტიუმი აცვია.</p></blockquote>
<h2>რა ღირს</h2>
<table><tbody><tr><th>მიდგომა</th><th>p95 შეყოვნება</th><th>ექსპლუატაციის ფასი</th></tr><tr><td>ILIKE სკანირება</td><td>1400მწმ</td><td>არანაირი</td></tr><tr><td>GIN + tsvector</td><td>12მწმ</td><td>ერთი ინდექსი</td></tr><tr><td>გარე კლასტერი</td><td>8მწმ</td><td>ახალი სამორიგეო გრაფიკი</td></tr></tbody></table>
<p>შუა მწკრივი ის ადგილია, სადაც პროდუქტების უმეტესობამ დიდხანს უნდა იცხოვროს. გადაინაცვლე მაშინ, როცა ციფრები გეტყვიან და არა მაშინ, როცა არქიტექტურის დიაგრამას მარტოობა მოაწყინდება.</p>`,
  },
  {
    author: 'nino',
    title: 'მოთხოვნების დამგეგმავი შენი მოწინააღმდეგე არ არის',
    subtitle: 'EXPLAIN-ის შედეგის წაკითხვა საუბრად და არა ბრალდებად.',
    topics: ['engineering', 'databases'],
    daysAgo: 11,
    body: `<p>ადამიანების უმეტესობა <code>EXPLAIN ANALYZE</code>-ს ავარიის დროს ხვდება, რაც იმას ჰგავს, კოლეგას პირველად მაშინ გაიცნო, როცა ის ყვირის. წაიკითხე ის მშვიდ შუადღეს.</p>
<h2>დაიწყე შიგნიდან</h2>
<p>გეგმები ერთმანეთშია ჩალაგებული. ყველაზე შიდა კვანძი პირველი სრულდება და ყოველი მისი გამოტანილი მწკრივი მშობლისთვის სამუშაოდ იქცევა. წაიკითხე ქვემოდან ზემოთ და პრობლემის ფორმა, როგორც წესი, ტექსტის დასრულებამდე გამოჩნდება.</p>
<h2>ციფრი, რომელსაც მნიშვნელობა აქვს</h2>
<p>შეადარე <em>სავარაუდო</em> მწკრივები <em>ფაქტობრივს</em>. დამგეგმავმა, რომელიც 3 მწკრივს ელოდება და 300 000-ს ხედავს, ამ კვანძის ზემოთ ყველა გადაწყვეტილება მცდარ ინფორმაციაზე მიიღო. გაასწორე შეფასება და გეგმა ხშირად თავად სწორდება.</p>
<ul><li>მოძველებული სტატისტიკა: გაუშვი <code>ANALYZE</code>.</li><li>კორელირებული სვეტები, რომლებსაც დამგეგმავი დამოუკიდებლად თვლის: გაფართოებული სტატისტიკა.</li><li>ფუნქცია, რომელშიც დამგეგმავი ვერ ხედავს: გადაწერე ჩვეულებრივ პირობად.</li></ul>
<p>მხოლოდ ამის შემდეგ მიმართე ინდექსების მინიშნებებსა და გადაწერას. უმეტეს შემთხვევაში ეს არც დაგჭირდება.</p>`,
  },
  {
    author: 'giorgi',
    title: 'თეთრი სივრცე ყველაზე იაფი დიზაინის ხელსაწყოა, რაც გაქვს',
    subtitle: 'სანამ რამეს დაამატებ, სცადე რამის მოშორება.',
    topics: ['design', 'writing'],
    daysAgo: 4,
    body: `<p>როცა ეკრანი არასწორად გამოიყურება, ცდუნება დამატებაა: გამყოფი ხაზი, ბარათი, ჩრდილი, აქცენტის ფერი. თითქმის ყოველთვის უკეთესი ნაბიჯი გამოკლებაა.</p>
<h2>სივრცე სტრუქტურას გადმოსცემს</h2>
<p>ორი ერთმანეთთან ახლოს მდგარი ელემენტი დაკავშირებულად იკითხება. დააშორე და ისინი ცალკე იდეებად იქცევიან. ეს მთელი გრამატიკაა და ის ერთი ჩარჩოს გარეშეც მუშაობს.</p>
<blockquote><p>თუ დაჯგუფების ასახსნელად ხაზი გჭირდება, დაშორებამ უკვე ვერ იმუშავა.</p></blockquote>
<h2>სკალა და არა მიხვედრა</h2>
<p>აირჩიე დაშორების სკალა და უარი თქვი მისგან გადახვევაზე. ოთხი, რვა, თორმეტი, თექვსმეტი, ოცდაოთხი, ოცდათორმეტი. შეზღუდვა თავად არის აზრი. თვითნებური მნიშვნელობები სწორედ ისაა, რითაც ინტერფეისები ნელ-ნელა მიდიან ოდნავ ავადმყოფურ შეგრძნებამდე.</p>
<ol><li>განსაზღვრე სკალა ერთხელ.</li><li>გამოიყენე უმცირესი საფეხური, რომელიც მაინც აცალკევებს.</li><li>გაზარდე საფეხური იერარქიის ყოველ დონეზე, არასდროს შეამცირო.</li></ol>
<p>თავშეკავება თავდაჯერებულობად იკითხება. სიმჭიდროვე — შფოთვად.</p>`,
  },
  {
    author: 'giorgi',
    title: 'შრიფტის შერჩევა გრძელი ტექსტის კითხვისთვის',
    subtitle: 'სტრიქონის სიგრძე, სტრიქონთაშორისი და ორი პარამეტრი, რომელსაც თითქმის ყველა ცდება.',
    topics: ['design', 'writing'],
    daysAgo: 20,
    body: `<p>საკითხავ ინტერფეისს ერთი ამოცანა აქვს: ადამიანმა სტატია ბოლომდე წაიკითხოს. ტიპოგრაფია ამ ამოცანის უდიდესი ნაწილია.</p>
<h2>სტრიქონის სიგრძე</h2>
<p>სამოციდან სამოცდათხუთმეტამდე სიმბოლო სტრიქონში. უფრო განიერი და თვალი კარგავს დაბრუნების ხაზს; უფრო ვიწრო და რიტმი ყოველ რამდენიმე სიტყვაში ირღვევა. ეს ერთი ციფრი გაგებისთვის იმაზე მეტს აკეთებს, ვიდრე შრიფტის ნებისმიერი არჩევანი.</p>
<h2>სტრიქონთაშორისი მანძილი</h2>
<p>ძირითად ტექსტს სჭირდება დაახლოებით თავისი ზომის 1.6&times;. სათაურებს ნაკლები, ხშირად 1.1&times;-თან ახლოს, რადგან დიდი ასოები თავისთავად ატარებენ ვიზუალურ სივრცეს.</p>
<table><tbody><tr><th>ელემენტი</th><th>ზომა</th><th>სტრიქონის სიმაღლე</th></tr><tr><td>ძირითადი ტექსტი</td><td>18px</td><td>1.7</td></tr><tr><td>H2</td><td>28px</td><td>1.25</td></tr><tr><td>წარწერა</td><td>14px</td><td>1.5</td></tr></tbody></table>
<p>დანარჩენი — შრიფტი, ფერი, ჭკვიანური ლიგატურები — დამრგვალების ცდომილებაა ამ ორის სწორად შერჩევასთან შედარებით.</p>`,
  },
  {
    author: 'tamar',
    title: 'შენი გეგმა ფსონების სიაა და არა დაპირებების',
    subtitle: 'როგორ ვისაუბროთ მომავალზე ისე, რომ არავის მოვატყუოთ.',
    topics: ['product', 'startups'],
    daysAgo: 1,
    body: `<p>გრაფიკად წარდგენილი გეგმა მცდარი აღმოჩნდება და ყველას დაამახსოვრდება, რომ ის მცდარი იყო. ფსონების ნაკრებად წარდგენილი გეგმა შეიძლება მცდარიც იყოს და სასარგებლოც დარჩეს.</p>
<h2>თქვი დარწმუნებულობა ხმამაღლა</h2>
<ul><li><strong>დადასტურებული</strong> — კვლევა ჩატარებულია, სამუშაო შეფასებულია, გამოვუშვებთ.</li><li><strong>სავარაუდო</strong> — პრობლემის გვჯერა, გადაწყვეტა ჯერ კიდევ იცვლება.</li><li><strong>საძიებო</strong> — ჯერ დარწმუნებული არ ვართ, რომ ეს რეალურია.</li></ul>
<p>სამი იარლიყი გეგმასთან დაკავშირებული კონფლიქტის უმეტესობას აქრობს, რადგან კამათი თარიღებზე წყდება და მტკიცებულებებზე იწყება.</p>
<h2>გადახედე წაგებულ ფსონებს</h2>
<p>გუნდები გამოშვებულ ფუნქციებს გამუდმებით განიხილავენ, მიტოვებულს კი თითქმის არასდროს. სწორედ მიტოვებულებშია სწავლა კონცენტრირებული. დადე ისინი იმავე გვერდზე.</p>
<blockquote><p>გეგმის დანიშნულებაა, უთანხმოება ადრე მოხდეს, სანამ ის ჯერ კიდევ იაფია.</p></blockquote>`,
  },
  {
    author: 'tamar',
    title: 'რა შემეშალა პირველი ხუთი თანამშრომლის აყვანისას',
    subtitle: 'ოთხი ძვირადღირებული გაკვეთილი და ერთი, რომელმაც მართლა იმუშავა.',
    topics: ['startups', 'career'],
    daysAgo: 30,
    body: `<p>პირველი ხუთი თანამშრომელი კულტურას ქმნის, გინდა ეს თუ არა. მე არაფერი მინდოდა და კულტურა მაინც მივიღე.</p>
<h2>აყვანა იმ კომპანიისთვის, რომელიც გაქვს</h2>
<p>მე ვაყვანდი იმ სტრუქტურისთვის, რომელსაც თვრამეტ თვეში წარმოვიდგენდი. ეს ადამიანები რვა კვირაში მოიწყინეს, რადგან მათ წინაშე მდგარი სამუშაო უფრო მცირე და არეული იყო, ვიდრე ის, რაც მე აღვწერე.</p>
<h2>გასაუბრება, რომელმაც იმუშავა</h2>
<p>ანაზღაურებადი ნახევარი დღე რეალურ, კონკრეტულ ამოცანაზე ჩვენი ნამდვილი სამუშაო სიიდან. ძვირი, ნელი და ყველაზე პროგნოზირებადი სიგნალი, რაც კი ოდესმე შეგვიგროვებია.</p>
<ol><li>აირჩიე სამუშაო, რომელიც მართლა სასარგებლოა.</li><li>მიეცი ერთი და იგივე დავალება ყველას.</li><li>განიხილე მსჯელობა და არა შედეგი.</li></ol>
<p>დანარჩენი, რაც ვცადეთ, უკეთ კორელირებდა გასაუბრების ვარჯიშთან, ვიდრე თავად სამუშაოსთან.</p>`,
  },
  {
    author: 'levan',
    title: 'მოდელების შეფასება ძირითადად მონაცემების პრობლემაა',
    subtitle: 'ბენჩმარკები ნაკლებს გეუბნებიან, ვიდრე ასი კარგად შერჩეული მაგალითი.',
    topics: ['ai', 'science'],
    daysAgo: 6,
    body: `<p>საჯარო ბენჩმარკები სასარგებლოა იმისთვის, რასაც ზომავს, და შეცდომაში შემყვანი ყველაფერი დანარჩენისთვის. თუ შენი პროდუქტი ერთ კონკრეტულ საქმეს აკეთებს, სწორედ ის გაზომე.</p>
<h2>ჯერ პატარა ნაკრები ააგე</h2>
<p>ასი მაგალითი, რომელიც თავად შეარჩიე რეალური გამოყენებიდან, სადაც უთანხმოებები დარგის მცოდნე ადამიანმა გადაწყვიტა. ეს ნაკრები უფრო მეტ რეგრესიას დაიჭერს, ვიდრე ნებისმიერი სარეიტინგო ცხრილი.</p>
<h2>დაასახელე შეცდომა და არა მხოლოდ ქულა</h2>
<table><tbody><tr><th>შეცდომის ტიპი</th><th>წილი</th><th>გამოსწორდება მოთხოვნით?</th></tr><tr><td>კონტექსტის ნაკლებობა</td><td>41%</td><td>არა</td></tr><tr><td>ფორმატის გადახრა</td><td>27%</td><td>კი</td></tr><tr><td>ზედმეტი თავდაჯერება</td><td>19%</td><td>ნაწილობრივ</td></tr><tr><td>მსჯელობის ნამდვილი შეცდომა</td><td>13%</td><td>არა</td></tr></tbody></table>
<p>ერთი ჯამური ციფრი ოთხივეს მალავს. ცხრილი გეუბნება, რა უნდა ააშენო შემდეგ.</p>
<blockquote><p>შეფასება, რომლის არ გჯერა, უარესია, ვიდრე შეფასების არქონა, რადგან მას მაინც იმოწმებენ შეხვედრებზე.</p></blockquote>`,
  },
  {
    author: 'levan',
    title: 'ნელა კითხვა განზრახ',
    subtitle: 'არგუმენტი მეტი წიგნის დასრულების წინააღმდეგ.',
    topics: ['writing', 'health'],
    daysAgo: 14,
    body: `<p>ორი წელი ვატარებდი იმის ოპტიმიზაციას, რამდენ წიგნს ვასრულებდი, და თითქმის არცერთი არ შემრჩა. თვლა თავად იყო პრობლემა.</p>
<h2>ერთი იდეა ერთ ჯდომაზე</h2>
<p>იკითხე მანამ, სანამ რამე მართლა არ შეგიცვლის აზრს, შემდეგ გაჩერდი და ჩაიწერე, რა შეიცვალა. ზოგიერთ საღამოს ეს ორმოცი გვერდია. ზოგიერთ საღამოს — ერთი აბზაცი.</p>
<h2>ხელახლა კითხვისას ილექება</h2>
<p>მეორე კითხვისას ხდება გაგების უმეტესი ნაწილი, რაც ნიშნავს, რომ ორჯერ წაკითხული პატარა თარო სჯობს ერთხელ წაკითხულ დიდს.</p>
<ul><li>გააკეთე ერთი ჩანაწერი წიგნზე და არა თავზე.</li><li>დაწერე საკუთარი სიტყვებით, თორემ არ ჩაითვლება.</li><li>გადაიკითხე ჩანაწერი შემდეგ ჯდომამდე.</li></ul>`,
  },
  {
    author: 'ana',
    title: 'მარილი, სითბო, დრო: პრაქტიკული ჩარჩო სამუშაო დღისთვის',
    subtitle: 'სამი ცვლადი ხსნის იმის უმეტესობას, რაც სახლის სამზარეულოში არასწორად მიდის.',
    topics: ['food'],
    daysAgo: 3,
    body: `<p>თითქმის ყველა იმედგაცრუებული სამუშაო დღის ვახშამი სამი ცვლადიდან ერთ-ერთის შეცდომაა და მათზე მსჯელობა ადვილია, როგორც კი დაასახელებ.</p>
<h2>მარილი</h2>
<p>დაამარილე ფენებად, გასინჯე ყოველ ფენაზე. ბოლოს დამატებული მარილი ზემოდან ზის; ადრე დამატებული კერძის ნაწილად იქცევა.</p>
<h2>სითბო</h2>
<p>სახლის მზარეულების უმეტესობა ძალიან ცოტას იყენებს. არასაკმარისად გახურებული ტაფა ორთქლავს დაბრაწვის ნაცვლად, დაბრაწვა კი სწორედ ის ადგილია, საიდანაც გემო უნდა მოსულიყო.</p>
<h2>დრო</h2>
<table><tbody><tr><th>მიზანი</th><th>სითბო</th><th>დრო</th></tr><tr><td>შებრაწვა</td><td>ძალიან მაღალი</td><td>2–3 წთ თითო მხარეს</td></tr><tr><td>დაოფლება</td><td>დაბალი</td><td>10–12 წთ</td></tr><tr><td>ჩაშუშვა</td><td>დაბალი, დახურული</td><td>90 წთ+</td></tr></tbody></table>
<p>აირჩიე მწკრივი, სანამ ცეცხლს ანთებ. სამზარეულოს კატასტროფების უმეტესობა დაოფლების გრაფიკზე ნაცადი შებრაწვაა.</p>`,
  },
  {
    author: 'ana',
    title: 'მომზადება პირველი ნახევარმარათონისთვის ისე, რომ არ შეგძულდეს',
    subtitle: 'თორმეტი კვირა, სამი სირბილი კვირაში, გმირობის გარეშე.',
    topics: ['health'],
    daysAgo: 22,
    body: `<p>გეგმა, რომელმაც იმუშავა, მოსაწყენი იყო — სწორედ ესაა აზრი. საინტერესო სავარჯიშო გეგმები, როგორც წესი, ტრავმების დაგეგმვის ხერხია.</p>
<h2>კვირა</h2>
<ol><li>ერთი მსუბუქი სირბილი, სასაუბრო ტემპით, ორმოცი წუთი.</li><li>ერთი ოდნავ არასასიამოვნო სირბილი, ინტერვალები ან თანაბარი ტემპი.</li><li>ერთი გრძელი სირბილი, რომელიც კვირაში ათ პროცენტზე მეტით არ იზრდება.</li></ol>
<h2>მსუბუქი ნიშნავს იმაზე მსუბუქს, ვიდრე გგონია</h2>
<p>თუ საუბარს ვერ აგრძელებ, ეს მსუბუქი სირბილი არაა და ის ჩუმად პარავს კვირის ბოლოს დაგეგმილ მძიმე დღეს.</p>
<blockquote><p>თანმიმდევრულობა სჯობს ინტენსივობას ნებისმიერ მონაკვეთზე, რომელიც ორ კვირაზე გრძელია.</p></blockquote>`,
  },
  {
    author: 'nino',
    title: 'ჩანაწერები მიგრაციებზე, რომლებიც არასდროს ბლოკავს',
    subtitle: 'მონახაზი — ჯერ კიდევ ვაგროვებ ისტორიებს.',
    topics: ['databases', 'engineering'],
    daysAgo: 0,
    status: 'draft',
    body: `<p>სვეტის დამატება უფასოა. სვეტის დამატება ნაგულისხმევი მნიშვნელობით ადრე არ იყო. ნამდვილი საფრთხე მონაცემების შევსებაშია.</p>
<ul><li>ჩაწერე ახალი სვეტი, აწარმოე ორმაგი ჩაწერა, შეავსე პარტიებად, შემდეგ გადაიტანე კითხვა.</li><li>არასდროს გეჭიროს ბლოკი შევსების განმავლობაში.</li></ul>
<p>გასაკეთებელი: დავამატო მარტის ინციდენტი.</p>`,
  },
  {
    author: 'giorgi',
    title: 'ფერების სისტემა, რომელიც მუქ თემას გაუძლებს',
    subtitle: 'სემანტიკური ტოკენები და არა თექვსმეტობითი კოდები.',
    topics: ['design', 'css'],
    daysAgo: 8,
    body: `<p>მუქი თემა შლის ფერების სისტემებს, რომლებიც თექვსმეტობითი კოდების სიად იყო აღწერილი, რადგან სიამ არ იცის, <em>რისთვის</em> არის რომელიმე ფერი.</p>
<h2>დაასახელე როლი</h2>
<p>არა <code>--grey-200</code>, არამედ <code>--surface-raised</code>. როლები თემის ცვლილებას გადაურჩება; ტონები — არა.</p>
<ul><li><code>--surface</code>, <code>--surface-raised</code>, <code>--border</code></li><li><code>--text</code>, <code>--text-muted</code></li><li><code>--accent</code>, <code>--accent-contrast</code></li></ul>
<h2>კონტრასტი სიმეტრიული არაა</h2>
<p>პალიტრა, რომელიც ღია თემაზე კონტრასტის ტესტს გადის, ინვერსიის შემდეგ ავტომატურად არ გაივლის მას. სუფთა თეთრი ტექსტი სუფთა შავ ფონზე გრძელი კითხვისთვის არასასიამოვნოა; მიიტანე ორივე ბოლო შუისკენ.</p>
<table><tbody><tr><th>ტოკენი</th><th>ღია</th><th>მუქი</th></tr><tr><td>surface</td><td>#ffffff</td><td>#0f1115</td></tr><tr><td>text</td><td>#111418</td><td>#e8eaed</td></tr><tr><td>border</td><td>#e6e8eb</td><td>#232830</td></tr></tbody></table>`,
  },
  {
    author: 'tamar',
    title: 'ფასი პოზიციონირებაა',
    subtitle: 'ციფრი ეუბნება ადამიანებს, ვისთვისაა პროდუქტი.',
    topics: ['startups', 'finance', 'product'],
    daysAgo: 17,
    body: `<p>გუნდები ფასს განიხილავენ, როგორც შემოსავლის ბერკეტს, რომელსაც პროდუქტის აშენების შემდეგ ქაჩავენ. მომხმარებლები მას კითხულობენ, როგორც პირველ და ყველაზე ნათელ განცხადებას იმის შესახებ, ვისთვისაა პროდუქტი.</p>
<h2>იაფი განცხადებაა</h2>
<p>დაბალი ფასი მხოლოდ შემოსავალს არ ამცირებს — ის მყიდველს ეუბნება, რომ პროდუქტი სერიოზული არაა, და არჩევს იმ მომხმარებლებს, რომლებსაც ყველაზე ნაკლებად შეუძლიათ მის გაუმჯობესებაში დაგეხმარონ.</p>
<h2>დააწესე ფასი ღირებულების ერთეულზე</h2>
<p>ადგილები, მოხმარება, შედეგები. ის ერთეული, რომელიც იზრდება მომხმარებლის წარმატებისას, სწორედ ისაა, რაზეც ფასი უნდა დააწესო, რადგან მაშინ შენი შემოსავალი მათი წარმატების გვერდითი ეფექტია და არა მასზე დაწესებული გადასახადი.</p>
<blockquote><p>თუ შენი ფასების გვერდი აბზაცი ბოდიშს საჭიროებს, მოდელი არასწორია.</p></blockquote>`,
  },
  {
    author: 'levan',
    title: 'TypeScript-ის ტიპები დოკუმენტაციაა, რომელიც ვერ დაძველდება',
    subtitle: 'გახადე დაუშვებელი მდგომარეობები წარმოუდგენელი და კომენტარები ზედმეტი გახდება.',
    topics: ['engineering', 'typescript'],
    daysAgo: 9,
    body: `<p>კომენტარი, რომელიც განმარტავს, რომ <code>status</code> მხოლოდ სამი სტრიქონიდან ერთი შეიძლება იყოს, ერთ წელიწადში მცდარი გახდება. გაერთიანების ტიპი იგივე წინადადებაა, ოღონდ აღსრულებული.</p>
<h2>დისკრიმინირებული გაერთიანებები მძიმე სამუშაოს აკეთებენ</h2>
<pre><code>type Result =
  | { ok: true; value: Post }
  | { ok: false; error: string }</code></pre>
<p>ასე აღწერის შემდეგ კომპილატორი არ მოგცემს <code>value</code>-ს წაკითხვის საშუალებას <code>ok</code>-ის შემოწმების გარეშე. შემოწმება აღარაა დისციპლინა; ის სტრუქტურაა.</p>
<h2>გაუძელი any-ს ცდუნებას</h2>
<p>ყოველი <code>any</code> პატარა ხვრელია კორპუსში. ერთს გადარჩები. ორმოცი სწორედ ისაა, რითაც კოდის ბაზა ჩუმად ისევ JavaScript-ად იქცევა.</p>`,
  },
];

const COMMENT_BODIES = [
  'ეს თითქმის ზუსტად ემთხვევა ჩემს გამოცდილებას. განსაკუთრებით წონების ნაწილი.',
  'შევინახე. თვეებია ამას ვამტკიცებ გუნდში და ახლა უბრალოდ ბმულს გავუგზავნი.',
  'საინტერესოა, როგორ მუშაობს ეს უფრო დიდ მასშტაბზე — რამდენიმე მილიონ მწკრივს გადააჭარბე?',
  'ბოლოს მოცემული ცხრილი მთელი სტატიაა. მანამდე ყველაფერი მხოლოდ შესავალია.',
  'მეორე პუნქტს ოდნავ არ ვეთანხმები, მაგრამ ჩარჩო მაინც სასარგებლოა.',
  'მართლა შეცვალა, როგორ მივუდგები ამას შემდეგ კვირას. მადლობა.',
  'ძალიან მინდა გაგრძელება, რომელიც აქ არსებულ კომპრომისებში უფრო ღრმად ჩაიხედავს.',
  'შუაში მოცემული ციტატა პირდაპირ ჩვენი გუნდის სახელმძღვანელოში მიდის.',
];

// Mirrors src/lib/utils.ts: Georgian titles have to reach the URL as Latin,
// otherwise the ASCII filter below leaves nothing but the id suffix.
const GEORGIAN_LATIN: Record<string, string> = {
  ა: 'a', ბ: 'b', გ: 'g', დ: 'd', ე: 'e', ვ: 'v', ზ: 'z', თ: 't', ი: 'i', კ: 'k',
  ლ: 'l', მ: 'm', ნ: 'n', ო: 'o', პ: 'p', ჟ: 'zh', რ: 'r', ს: 's', ტ: 't', უ: 'u',
  ფ: 'p', ქ: 'k', ღ: 'gh', ყ: 'q', შ: 'sh', ჩ: 'ch', ც: 'ts', ძ: 'dz', წ: 'ts',
  ჭ: 'ch', ხ: 'kh', ჯ: 'j', ჰ: 'h',
};

function transliterate(input: string) {
  let out = '';
  for (const char of input) out += GEORGIAN_LATIN[char] ?? char;
  return out;
}

// Mirrors src/lib/sanitize.ts: block boundaries become spaces so words never weld.
function htmlToText(html: string) {
  return html
    .replace(/<\/(p|h[1-6]|li|td|th|tr|blockquote|pre|div)>|<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&times;/g, '×')
    .replace(/&mdash;/g, '—')
    .replace(/\s+/g, ' ')
    .trim();
}

function pick<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) out.push(...copy.splice(Math.floor(Math.random() * copy.length), 1));
  return out;
}

async function main() {
  console.log('Seeding dawere…');

  // Wipe in dependency order. The editorial topics come from db/schema.sql and
  // stay; tags invented while writing go with the posts that carried them.
  await sql`truncate table
    search_events, topic_affinity, author_affinity, follows, bookmarks, likes,
    comments, post_views, post_topics, posts, media, sessions, users
    restart identity cascade`;
  await sql`delete from topics where not is_featured`;
  // truncate fires no row triggers, so the counters are reset by hand.
  await sql`update topics set post_count = 0`;

  const topicIds = new Map<string, string>();
  for (const [slug, name, description] of TOPICS) {
    const [row] = await sql<{ id: string }[]>`
      insert into topics (slug, name, description)
      values (${slug}, ${name}, ${description})
      on conflict (slug) do update set slug = excluded.slug
      returning id`;
    topicIds.set(slug, row.id);
  }
  const [{ count: topicCount }] = await sql<{ count: string }[]>`select count(*) from topics`;
  console.log(`  ${topicCount} topics`);

  const passwordHash = await bcrypt.hash('password123', 10);
  const userIds = new Map<string, string>();
  for (const u of USERS) {
    const [row] = await sql<{ id: string }[]>`
      insert into users (email, password_hash, name, username, bio, location, website, onboarded_at)
      values (${u.email}, ${passwordHash}, ${u.name}, ${u.username}, ${u.bio}, ${u.location}, ${u.website}, now())
      returning id`;
    userIds.set(u.username, row.id);
  }
  console.log(`  ${USERS.length} users (password: password123)`);

  const postIds: { id: string; authorId: string }[] = [];
  for (const p of POSTS) {
    const authorId = userIds.get(p.author)!;
    const published = (p.status ?? 'published') === 'published';
    const at = new Date(Date.now() - p.daysAgo * 86_400_000);
    const text = htmlToText(p.body);
    const id = randomUUID();
    const slug = `${transliterate(p.title)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 60)}-${id.slice(0, 6)}`;

    await sql`
      insert into posts (id, author_id, slug, title, subtitle, content_html, content_text,
                         status, reading_minutes, published_at, created_at, updated_at)
      values (${id}, ${authorId}, ${slug}, ${p.title}, ${p.subtitle}, ${p.body}, ${text},
              ${published ? 'published' : 'draft'},
              ${Math.max(1, Math.round(text.length / 1100))},
              ${published ? at : null}, ${at}, ${at})`;

    for (const t of p.topics) {
      const topicId = topicIds.get(t);
      if (topicId) await sql`insert into post_topics (post_id, topic_id) values (${id}, ${topicId})`;
    }
    if (published) postIds.push({ id, authorId });
  }
  console.log(`  ${POSTS.length} posts`);

  const allUserIds = [...userIds.values()];

  // Follows: everyone follows two or three others.
  for (const follower of allUserIds) {
    for (const following of pick(allUserIds.filter((id) => id !== follower), 2 + Math.floor(Math.random() * 2))) {
      await sql`insert into follows (follower_id, following_id) values (${follower}, ${following})
                on conflict do nothing`;
    }
  }

  // Engagement: views, likes and comments, weighted so older posts have more.
  let likeTotal = 0;
  let commentTotal = 0;
  for (const post of postIds) {
    const readers = allUserIds.filter((id) => id !== post.authorId);

    const viewers = 8 + Math.floor(Math.random() * 40);
    for (let i = 0; i < viewers; i++) {
      const isMember = i < readers.length && Math.random() > 0.4;
      const userId = isMember ? readers[i] : null;
      await sql`
        insert into post_views (post_id, user_id, viewer_key, created_at)
        values (${post.id}, ${userId}, ${userId ? `u:${userId}` : `v:seed-${randomUUID().slice(0, 8)}`},
                now() - (random() * interval '20 days'))
        on conflict do nothing`;
    }

    for (const reader of pick(readers, Math.floor(Math.random() * readers.length))) {
      await sql`insert into likes (post_id, user_id) values (${post.id}, ${reader}) on conflict do nothing`;
      likeTotal++;
    }

    for (const reader of pick(readers, Math.floor(Math.random() * 3))) {
      await sql`
        insert into comments (post_id, author_id, body, created_at)
        values (${post.id}, ${reader}, ${COMMENT_BODIES[Math.floor(Math.random() * COMMENT_BODIES.length)]},
                now() - (random() * interval '10 days'))`;
      commentTotal++;
    }
  }
  console.log(`  ${likeTotal} likes, ${commentTotal} comments`);

  // Seed interest scores from the engagement we just created, so "For you"
  // has something to work with on a fresh install.
  await sql`
    insert into topic_affinity (user_id, topic_id, score)
    select l.user_id, pt.topic_id, count(*) * 3.0
    from likes l join post_topics pt on pt.post_id = l.post_id
    group by l.user_id, pt.topic_id
    on conflict (user_id, topic_id) do update set score = excluded.score`;
  await sql`
    insert into author_affinity (user_id, author_id, score)
    select l.user_id, p.author_id, count(*) * 3.0
    from likes l join posts p on p.id = l.post_id
    where l.user_id <> p.author_id
    group by l.user_id, p.author_id
    on conflict (user_id, author_id) do update set score = excluded.score`;

  console.log('\nDone. Sign in with any of:');
  for (const u of USERS) console.log(`  ${u.email}  /  password123`);

  await sql.end();
}

main().catch(async (error) => {
  console.error(error);
  await sql.end();
  process.exit(1);
});
