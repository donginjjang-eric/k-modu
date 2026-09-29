// 실제 게시물 사진을 확인한 신규 말레이시아 미팅 크리에이터 14명을 공개한다.
globalThis.KMODU_MALAYSIA_NEW_MEETING_CREATORS = Object.freeze([
  { name: "Aweenzul", slug: "aweenzul", instagram: "aweenzul", tiktok: "aweenzull" },
  { name: "Nurin", slug: "nurin", instagram: "nurinsyaaamimi", tiktok: "nurinsyaaamimi" },
  { name: "Aisyah", slug: "aisyah", instagram: "i.nrayshhh", tiktok: "itsmeayshh" },
  { name: "Ifa", slug: "ifa", instagram: "i.zaifa", tiktok: "keraibebeh" },
  { name: "Arisya", slug: "arisya", instagram: "arisyajafri", tiktok: "arisyajafri" },
  { name: "Amira Sofee", slug: "amira-sofee", instagram: "amirasofeee", tiktok: "mirasosoft" },
  { name: "Nisa", slug: "nisa", instagram: "nisa.shuk", tiktok: "nisa.shuk" },
  { name: "Iqin", slug: "iqin", instagram: "iiqinlydeana", tiktok: "iqiniqin3" },
  { name: "Fatin", slug: "fatin-mazlan", instagram: "ffatinmazlan", tiktok: "ffatinmazlan" },
  { name: "Deyeng", slug: "deyeng", instagram: "nrrndhrh", tiktok: "deyengshipuden" },
  { name: "Balqis", slug: "balqis", instagram: "balqisjohn", tiktok: "balqisjohn" },
  { name: "Arisha", slug: "arisha-zlyn", instagram: "arishazlyn_", tiktok: "arishazlynn" },
  { name: "Nik", slug: "nik", instagram: "omarynik", tiktok: "omary_nik" },
  { name: "Jeslyyn", slug: "jeslyyn", instagram: "jeslyyntengycl93", tiktok: "jeslyynteng93" },
].map((creator) => Object.freeze({
  ...creator,
  instagramUrl: `https://www.instagram.com/${creator.instagram}/`,
  tiktokUrl: `https://www.tiktok.com/@${creator.tiktok}`,
  image: `assets/influencer-sourcing/cards/malaysia-new-meeting/${creator.slug}.webp`,
  direction: "Creator",
  type: "Editorial",
  instagramFollowers: null,
  tiktokFollowers: null,
  totalFollowers: null,
  followersVerifiedAt: null,
})));

globalThis.KMODU_RENDER_MALAYSIA_NEW_MEETING_CREATORS = (creators, { imageMarkup }) => creators.map((creator) => `
  <article class="market-card is-seeding is-meeting is-new-meeting" data-category="Instagram Editorial TikTok Styling Fashion Creator K-Beauty Creator" data-status="new" data-platform="Instagram" data-type="Editorial" data-market="MY" data-fit="" data-followers="" data-er="" data-search="${creator.name.toLowerCase()} ${creator.instagram.toLowerCase()} ${creator.tiktok.toLowerCase()} malaysia meeting" data-instagram-url="${creator.instagramUrl}" data-tiktok-url="${creator.tiktokUrl}">
    <div class="thumb">${imageMarkup(creator.image, creator.name, 900, 1200)}<span class="flag">MEETING</span><button type="button" aria-label="Save ${creator.name}">♡</button></div>
    <div class="market-card-body"><div class="badges"><span>INSTAGRAM</span><span>NEW</span><span>MY</span></div><h3>${creator.name}</h3><p>Malaysia / Creator / @${creator.instagram}</p><div class="mini-stats"><span><strong>—</strong>Followers</span><span><strong>—</strong>IG · TT</span></div><strong class="reward">MEETING</strong></div>
  </article>`).join("");
