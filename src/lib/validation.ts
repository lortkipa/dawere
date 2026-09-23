import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .min(3, 'შეიყვანე ელფოსტის მისამართი.')
  .max(254)
  .email('ეს ელფოსტის მისამართს არ ჰგავს.')
  .transform((v) => v.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, 'გამოიყენე მინიმუმ 8 სიმბოლო.')
  .max(200, 'ეს პაროლი ძალიან გრძელია.');

export const nameSchema = z
  .string()
  .trim()
  .min(2, 'მიუთითე შენი სახელი.')
  .max(60, 'სახელი 60 სიმბოლოზე მოკლე უნდა იყოს.');

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'მომხმარებლის სახელს მინიმუმ 3 სიმბოლო სჭირდება.')
  .max(30, 'მომხმარებლის სახელი 30 სიმბოლოზე მოკლე უნდა იყოს.')
  .regex(/^[a-z0-9_]+$/, 'მხოლოდ ლათინური ასოები, ციფრები და ქვედა ტირე.');

export const signUpSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'შეიყვანე პაროლი.'),
});

export const profileSchema = z.object({
  name: nameSchema,
  username: usernameSchema,
  bio: z.string().trim().max(280, 'ბიოგრაფია 280 სიმბოლოზე მოკლე უნდა იყოს.').default(''),
  location: z.string().trim().max(80).default(''),
  website: z
    .string()
    .trim()
    .max(200)
    .refine((v) => v === '' || /^https?:\/\/.+\..+/.test(v), 'მიუთითე სრული მისამართი, რომელიც http:// ან https://-ით იწყება')
    .default(''),
});

/** What an admin may change on someone's profile: the settings fields plus the email. */
export const adminUserSchema = profileSchema.extend({ email: emailSchema });

export const adminCreateUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  // Blank means "derive one from the name", as sign-up does.
  username: z.union([z.literal(''), usernameSchema]).default(''),
  // Blank means "generate one", shown once to the admin who made the account.
  password: z.union([z.literal(''), passwordSchema]).default(''),
  access: z.enum(['user', 'admin']).default('user'),
});

export const topicSchema = z.object({
  name: z.string().trim().min(1, 'მიეცი თემას სახელი.').max(40, 'სახელი მაქსიმუმ 40 სიმბოლოა.'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(40, 'მისამართი მაქსიმუმ 40 სიმბოლოა.')
    .regex(/^[a-z0-9-]*$/, 'მხოლოდ ლათინური ასოები, ციფრები და ტირე.')
    .default(''),
  description: z.string().trim().max(200, 'აღწერა მაქსიმუმ 200 სიმბოლოა.').default(''),
  isFeatured: z.boolean().default(false),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'შეიყვანე მიმდინარე პაროლი.'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'ორი პაროლი არ ემთხვევა.',
    path: ['confirmPassword'],
  });

export const postSchema = z.object({
  title: z.string().trim().max(160, 'სათაური მაქსიმუმ 160 სიმბოლოა.').default(''),
  subtitle: z.string().trim().max(240, 'ქვესათაური მაქსიმუმ 240 სიმბოლოა.').default(''),
  contentHtml: z.string().max(400_000, 'ეს სტატია ძალიან გრძელია.').default(''),
  // Only our own uploads or an https image: this lands in <img src> and in the
  // Open Graph tags of every share.
  coverImageUrl: z
    .string()
    .trim()
    .max(500)
    .regex(/^(\/api\/media\/[0-9a-f-]{36}|https:\/\/\S+)$/i, 'ყდის სურათის მისამართი არასწორია.')
    .nullable()
    .default(null),
  topics: z.array(z.string().trim().min(1).max(40)).max(5, 'სტატიაზე მაქსიმუმ 5 თემა.').default([]),
});

export const commentSchema = z.object({
  body: z.string().trim().min(1, 'ჯერ დაწერე რამე.').max(2000, 'კომენტარი მაქსიმუმ 2000 სიმბოლოა.'),
  parentId: z.string().uuid().nullable().optional(),
});

export const reportSchema = z.object({
  targetType: z.enum(['post', 'comment', 'user']),
  targetId: z.string().uuid(),
  reason: z.enum(
    ['spam', 'harassment', 'hate', 'violence', 'sexual', 'misinformation', 'impersonation', 'copyright', 'other'],
    { error: 'აირჩიე მიზეზი.' },
  ),
  details: z.string().trim().max(1000, 'დეტალები მაქსიმუმ 1000 სიმბოლოა.').default(''),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'შეიყვანე პაროლი.'),
  confirm: z.literal('წაშლა', { error: 'დასადასტურებლად ჩაწერე „წაშლა“.' }),
});

/**
 * `values` echoes back what was typed. React resets a form after its action
 * resolves, so without it every validation error would also empty the fields.
 * Passwords are never echoed.
 */
export type FormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

/** The submitted text fields, minus anything secret, for `FormState.values`. */
export function echoValues(formData: FormData, ...keys: string[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of keys) {
    const value = formData.get(key);
    if (typeof value === 'string') values[key] = value;
  }
  return values;
}

/** Flattens a ZodError into the shape our forms render. */
export function zodToFormState(error: z.ZodError, values?: Record<string, string>): FormState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { ok: false, error: 'გთხოვ, გაასწორე მონიშნული ველები.', fieldErrors, values };
}
