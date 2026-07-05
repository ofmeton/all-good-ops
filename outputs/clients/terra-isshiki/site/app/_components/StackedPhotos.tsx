/* 2 枚の写真を「机に置いた写真のように」少しずらして重ねて浮かせる静的コンポーネント。
 * オーナーページの活動カードで使用。状態を持たないため server component のまま使える。
 * 写真は app/copy.ts で編集 */

import Image from "next/image";

export function StackedPhotos({
  images,
  className = "",
  sizes = "100vw",
}: {
  images: { src: string; alt: string }[];
  className?: string; // 親が aspect（例 aspect-[4/3]）や余白を渡す
  sizes?: string;
}) {
  // 1 枚しか無い場合は重ねずに全面フォールバック表示する。
  if (images.length <= 1) {
    const only = images[0];
    if (!only) return null;
    return (
      <div className={`relative ${className}`}>
        <div className="photo-float absolute inset-0 overflow-hidden rounded-sm bg-white">
          <Image src={only.src} alt={only.alt} fill sizes={sizes} quality={84} className="object-cover" />
        </div>
      </div>
    );
  }

  const [front, back] = images;

  return (
    // overflow は隠さない — 2 枚がずれてはみ出す「浮き」がこのコンポーネントの命。
    // 55% サイズで四隅に振り分け、重なりはごくわずかに留める。
    <div className={`relative ${className}`}>
      {/* 背面: 右下寄り・わずかに右回転 */}
      <div className="photo-float absolute right-0 bottom-0 h-[55%] w-[55%] rotate-[1.6deg] overflow-hidden rounded-sm bg-white">
        <Image src={back.src} alt={back.alt} fill sizes={sizes} quality={84} className="object-cover" />
      </div>

      {/* 手前: 左上寄り・背面と逆方向にごく僅か回転 */}
      <div className="photo-float absolute left-0 top-0 h-[55%] w-[55%] -rotate-[0.8deg] overflow-hidden rounded-sm bg-white">
        <Image src={front.src} alt={front.alt} fill sizes={sizes} quality={84} className="object-cover" />
      </div>
    </div>
  );
}
