import { UserAvatar } from "../UserAvatar";

export default function UserAvatarExample() {
  return (
    <div className="flex items-center gap-4">
      <UserAvatar name="Marco Rossi" size="sm" />
      <UserAvatar name="Marco Rossi" size="md" />
      <UserAvatar name="Marco Rossi" size="lg" />
    </div>
  );
}
