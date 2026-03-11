const Badge = ({ label, cls }) => (
  <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-bold ${cls}`}>
    {label}
  </span>
);

export default Badge;
