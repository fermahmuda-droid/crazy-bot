export function UserAvatar() {
  return (
    <svg
      width="56"
      height="56"
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="User avatar"
      className="flex-shrink-0"
    >
      <title>User</title>
      {/* Outer gray circle */}
      <circle cx="28" cy="28" r="28" fill="#B3B3B3" />

      <clipPath id="user-avatar-clip">
        <circle cx="28" cy="28" r="28" />
      </clipPath>

      <g clipPath="url(#user-avatar-clip)">
        {/* Head */}
        <ellipse cx="28" cy="21" rx="10" ry="11" fill="#E8E8E8" />
        {/* Body */}
        <ellipse cx="28" cy="51" rx="18" ry="18" fill="#E8E8E8" />
      </g>
    </svg>
  );
}
