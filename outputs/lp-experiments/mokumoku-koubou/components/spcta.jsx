// SP固定CTA
function SpCta(){
  return (
    <div className="sp-cta">
      <a href="#contact" className="btn btn-outline">
        <DocIcon size={16}/><span>資料請求</span>
      </a>
      <a href="#contact" className="btn btn-orange">
        <CalendarIcon size={16}/><span>見学予約</span>
      </a>
    </div>
  );
}
Object.assign(window, { SpCta });
