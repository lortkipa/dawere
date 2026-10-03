import type { User } from "@/lib/db/schema";
import { referrals, topics } from "@/lib/onboarding-options";

// Temporary test view of the signed-in user's row; replaced by the real home page later.
export function UserInfo({ user }: { user: User }) {
  const topicLabels = (user.topics ?? []).map(
    (slug) => topics.find((topic) => topic.slug === slug)?.label ?? slug,
  );
  const referralLabel = referrals.find((option) => option.slug === user.referral)?.label ?? user.referral;

  return (
    <main>
      <dl>
        <dt>სახელი</dt>
        <dd>{user.name}</dd>
        <dt>ელფოსტა</dt>
        <dd>{user.email}</dd>
        <dt>თემები</dt>
        <dd>{topicLabels.join(", ")}</dd>
        <dt>საიდან გაიგო</dt>
        <dd>
          {referralLabel}
          {user.referralOther && ` — ${user.referralOther}`}
        </dd>
      </dl>
    </main>
  );
}
