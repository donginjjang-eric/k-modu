// 실제 게시물 사진을 확인한 신규 말레이시아 미팅 크리에이터 14명을 공개한다.
globalThis.KMODU_MALAYSIA_NEW_MEETING_CREATORS = Object.freeze([
  { name: "Aweenzul", slug: "aweenzul", instagram: "aweenzul", tiktok: "aweenzull", instagramFollowers: 122000, tiktokFollowers: 89400 },
  { name: "Nurin", slug: "nurin", instagram: "nurinsyaaamimi", tiktok: "nurinsyaaamimi", instagramFollowers: 71000, tiktokFollowers: 94000 },
  { name: "Aisyah", slug: "aisyah", instagram: "i.nrayshhh", tiktok: "itsmeayshh", instagramFollowers: 61000, tiktokFollowers: 131300 },
  { name: "Ifa", slug: "ifa", instagram: "i.zaifa", tiktok: "keraibebeh", instagramFollowers: 32000, tiktokFollowers: 43000 },
  { name: "Arisya", slug: "arisya", instagram: "arisyajafri", tiktok: "arisyajafri", instagramFollowers: 20000, tiktokFollowers: 17200 },
  { name: "Amira Sofee", slug: "amira-sofee", instagram: "amirasofeee", tiktok: "mirasosoft", instagramFollowers: 21000, tiktokFollowers: 14100 },
  { name: "Nisa", slug: "nisa", instagram: "nisa.shuk", tiktok: "nisa.shuk", instagramFollowers: 64000, tiktokFollowers: 42700 },
  { name: "Iqin", slug: "iqin", instagram: "iiqinlydeana", tiktok: "iqiniqin3", instagramFollowers: 124000, tiktokFollowers: 50500 },
  { name: "Fatin", slug: "fatin-mazlan", instagram: "ffatinmazlan", tiktok: "ffatinmazlan", instagramFollowers: 49000, tiktokFollowers: 23000 },
  { name: "Deyeng", slug: "deyeng", instagram: "nrrndhrh", tiktok: "deyengshipuden", instagramFollowers: 30000, tiktokFollowers: 49000 },
  { name: "Balqis", slug: "balqis", instagram: "balqisjohn", tiktok: "balqisjohn", instagramFollowers: 44000, tiktokFollowers: 9579 },
  { name: "Arisha", slug: "arisha-zlyn", instagram: "arishazlyn_", tiktok: "arishazlynn", instagramFollowers: 16000, tiktokFollowers: 39300 },
  { name: "Nik", slug: "nik", instagram: "omarynik", tiktok: "omary_nik", instagramFollowers: 99000, tiktokFollowers: 197000 },
  { name: "Jeslyyn", slug: "jeslyyn", instagram: "jeslyyntengycl93", tiktok: "jeslyynteng93", instagramFollowers: 147000, tiktokFollowers: 33000 },
].map((creator) => Object.freeze({
  ...creator,
  instagramUrl: `https://www.instagram.com/${creator.instagram}/`,
  tiktokUrl: `https://www.tiktok.com/@${creator.tiktok}`,
  image: `assets/influencer-sourcing/cards/malaysia-new-meeting/${creator.slug}.webp`,
  direction: "Creator",
  type: "Editorial",
  totalFollowers: creator.instagramFollowers + creator.tiktokFollowers,
  followersVerifiedAt: "2026-09-29",
})));

globalThis.KMODU_RENDER_MALAYSIA_NEW_MEETING_CREATORS = (creators, { imageMarkup, formatFollowers }) => creators.map((creator) => `
  <article class="market-card is-seeding is-meeting is-new-meeting" data-category="Instagram Editorial TikTok Styling Fashion Creator K-Beauty Creator" data-status="new" data-platform="Instagram" data-type="Editorial" data-market="MY" data-fit="" data-followers="${creator.totalFollowers}" data-er="" data-search="${creator.name.toLowerCase()} ${creator.instagram.toLowerCase()} ${creator.tiktok.toLowerCase()} malaysia meeting" data-instagram-url="${creator.instagramUrl}" data-tiktok-url="${creator.tiktokUrl}">
    <div class="thumb">${imageMarkup(creator.image, creator.name, 900, 1200)}<span class="flag">MEETING</span><button type="button" aria-label="Save ${creator.name}">♡</button></div>
    <div class="market-card-body"><div class="badges"><span>INSTAGRAM</span><span>NEW</span><span>MY</span></div><h3>${creator.name}</h3><p>Malaysia / Creator / @${creator.instagram}</p><div class="mini-stats"><span><strong>${formatFollowers(creator.totalFollowers)}</strong>Total</span><span><strong>${formatFollowers(creator.instagramFollowers)}</strong>IG · TT ${formatFollowers(creator.tiktokFollowers)}</span></div><strong class="reward">MEETING</strong></div>
  </article>`).join("");
