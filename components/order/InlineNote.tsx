export default function InlineNote({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div className={`rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-gray-700 ${className}`}>
      {text}
    </div>
  );
}
