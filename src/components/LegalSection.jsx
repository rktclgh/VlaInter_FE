export const LegalSection = ({ title, body, children }) => (
  <section>
    <h2 className="text-[18px] font-semibold text-[#171b24]">{title}</h2>
    <div className="mt-3 space-y-3">
      {body
        ? body.map((line, index) => <p key={`${index}-${line.slice(0, 24)}`}>{line}</p>)
        : children}
    </div>
  </section>
);
