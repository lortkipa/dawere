"use client";

import { useCallback, useRef, useState } from "react";
import { logout } from "@/app/auth/actions";
import { avatarUrl } from "@/lib/user-view";
import { Avatar } from "./avatar";
import { dangerItemClass, Icon, MenuItem, menuClass, useDismiss } from "./menu";

export type MenuUser = { name: string | null; email: string; handle: string; avatar: string | null };

export function UserMenu({ user }: { user: MenuUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, ref, close);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="მენიუ"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex cursor-pointer rounded-full"
      >
        <Avatar src={avatarUrl(user.avatar)} />
      </button>

      {open && (
        <div role="menu" className={`${menuClass} w-64`}>
          <div className="px-3 py-2">
            {user.name && <p className="truncate font-medium text-ink">{user.name}</p>}
            <p className="truncate text-sm text-muted">{user.email}</p>
          </div>
          <div className="my-1 border-t border-line" />

          <MenuItem icon={<ProfileIcon />} href={`/@${user.handle}`} onClick={close}>
            პროფილი
          </MenuItem>
          <MenuItem icon={<SettingsIcon />} href="/settings" onClick={close}>
            პარამეტრები
          </MenuItem>
          {/* The help page doesn't exist yet; this only closes the menu. */}
          <MenuItem icon={<HelpIcon />} onClick={close}>
            დახმარება
          </MenuItem>

          <div className="my-1 border-t border-line" />
          <form action={logout}>
            <button type="submit" role="menuitem" className={dangerItemClass}>
              <LogoutIcon />
              გასვლა
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function ProfileIcon() {
  return (
    <Icon>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </Icon>
  );
}

function SettingsIcon() {
  return (
    <Icon>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}

function HelpIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" />
    </Icon>
  );
}

function LogoutIcon() {
  return (
    <Icon>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </Icon>
  );
}
