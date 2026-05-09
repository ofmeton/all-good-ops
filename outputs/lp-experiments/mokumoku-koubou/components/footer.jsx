// フッター

function Footer(){
  return (
    <footer className="site-footer">
      <img src="assets/decor/02.png" className="decor" style={{top:-30,left:"8%",width:70,opacity:.85}} alt=""/>
      <img src="assets/decor/01.png" className="decor" style={{top:-40,right:"10%",width:80,opacity:.85}} alt=""/>

      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <a href="#top" className="logo" style={{marginBottom:16}}>
              <img src="assets/logo/01.png" className="logo-img" alt=""/>
              <div className="logo-text">
                <div className="lt-1">みどり工務店</div>
                <div className="lt-2">自然素材の家づくり</div>
              </div>
            </a>
            <p>
              地域の暮らしに寄り添い、<br/>
              やさしい家づくりを一緒に考えます。<br/>
              ご相談・お見積もりは無料です。
            </p>
            <div className="footer-sns">
              <a href="#" aria-label="Instagram">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.4A4 4 0 1 1 12.6 8 4 4 0 0 1 16 11.4z"/><circle cx="17.5" cy="6.5" r=".5" fill="currentColor"/></svg>
              </a>
              <a href="#" aria-label="LINE">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.365 9.89c.50 0 .906.41.906.91s-.405.91-.91.91h-1.265v.812h1.265c.5 0 .91.41.91.91s-.41.91-.91.91h-2.176c-.5 0-.91-.41-.91-.91V8.07c0-.5.41-.91.91-.91h2.176c.5 0 .91.41.91.91s-.41.91-.91.91H18.1v.81h1.265zm-3.85 4.45c0 .39-.25.74-.62.86-.094.03-.19.04-.282.04-.296 0-.578-.14-.762-.39l-2.218-3.022v2.51c0 .5-.41.913-.91.913-.503 0-.913-.41-.913-.91V8.07c0-.39.25-.74.62-.86.097-.03.193-.04.286-.04.293 0 .574.14.760.388l2.218 3.022V8.07c0-.5.41-.91.91-.91s.91.41.91.91v6.27zm-7.225 0c0 .50-.41.91-.92.91s-.91-.41-.91-.91V8.07c0-.5.41-.91.91-.91.51 0 .92.41.92.91v6.27zm-2.964 0c0 .50-.41.91-.91.91H2.236c-.5 0-.91-.41-.91-.91V8.07c0-.5.41-.91.91-.91.502 0 .908.41.908.91v5.36h1.273c.5 0 .91.41.91.91zM12 0C5.371 0 0 4.398 0 9.798c0 4.83 4.243 8.882 9.952 9.65.392.082.927.258 1.064.594.122.305.08.78.04 1.087l-.171 1.039c-.052.305-.241 1.196 1.054.66 1.295-.535 6.985-4.105 9.527-7.029h.005C23.385 14.196 24 12.142 24 9.798 24 4.398 18.629 0 12 0z"/></svg>
              </a>
              <a href="#" aria-label="YouTube">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.6 15.5v-7l6.4 3.5-6.4 3.5z"/></svg>
              </a>
            </div>
          </div>

          <div className="footer-col">
            <h4>会社情報</h4>
            <ul>
              <li><a href="#">会社案内</a></li>
              <li><a href="#staff">スタッフ紹介</a></li>
              <li><a href="#">施工エリア</a></li>
              <li><a href="#">アクセス</a></li>
              <li><a href="#">採用情報</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>サポート</h4>
            <ul>
              <li><a href="#steps">家づくりの流れ</a></li>
              <li><a href="#faq">よくある質問</a></li>
              <li><a href="#voices">お客様の声</a></li>
              <li><a href="#contact">資料請求</a></li>
              <li><a href="#contact">見学予約</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>お問い合わせ</h4>
            <div className="footer-tel-card">
              <div className="label">お電話でのお問い合わせ</div>
              <div className="num">0120-123-456</div>
              <div className="hours">受付 9:00〜18:00（水曜定休）</div>
            </div>
            <div style={{marginTop:12,fontSize:12,color:"var(--ink-2)",lineHeight:1.8}}>
              〒999-0000<br/>◯◯県◯◯市みどり町1-2-3
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div>© 2025 みどり工務店. All rights reserved.</div>
          <div className="legal">
            <a href="#">プライバシーポリシー</a>
            <a href="#">特定商取引法</a>
            <a href="#">サイトマップ</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, { Footer });
