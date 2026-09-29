// 실제 SNS 계정과 게시물 사진을 확인한 베트남 아티스트 7명을 공개한다.
globalThis.KMODU_VIETNAM_ARTISTS = Object.freeze([
  { name: "Chi Pu", slug: "chi-pu", instagram: "chipupu", direction: "Music · fashion · beauty", instagramFollowers: 6000000 },
  { name: "Trang Pháp", slug: "trang-phap", instagram: "trang_phap", direction: "Music · fashion", instagramFollowers: 414000 },
  { name: "Đức Phúc", slug: "duc-phuc", instagram: "nguyenducphuc_", direction: "Music · lifestyle", instagramFollowers: 2000000 },
  { name: "Hòa Minzy", slug: "hoa-minzy", instagram: "hoaminzy_rose", direction: "Music · family · lifestyle", instagramFollowers: 4000000 },
  { name: "Isaac", slug: "isaac-vn", instagram: "isaaclion", direction: "Music · fashion", instagramFollowers: 3000000 },
  { name: "Thiều Bảo Trâm", slug: "thieu-bao-tram", instagram: "thieubaotram", direction: "Music · beauty · fashion", instagramFollowers: 3000000 },
  { name: "Văn Mai Hương", slug: "van-mai-huong", instagram: "vmhuong", direction: "Music · lifestyle", instagramFollowers: 979000 },
].map((artist) => Object.freeze({
  ...artist,
  market: "Vietnam",
  instagramUrl: `https://www.instagram.com/${artist.instagram}/`,
  tiktok: null,
  tiktokUrl: null,
  image: `assets/influencer-sourcing/cards/vietnam-artists/${artist.slug}.webp`,
  tiktokFollowers: null,
  totalFollowers: artist.instagramFollowers,
  followersVerifiedAt: "2026-09-29",
})));

globalThis.KMODU_RENDER_VIETNAM_ARTISTS = (artists, { imageMarkup, formatFollowers }) => artists.map((artist) => `
  <article class="market-card is-seeding is-artist" data-category="Instagram Editorial${artist.direction.includes("beauty") ? " K-Beauty Creator" : ""}" data-status="new" data-platform="Instagram" data-type="Editorial" data-market="VN" data-fit="" data-followers="${artist.totalFollowers}" data-er="" data-search="${artist.name.toLowerCase()} ${artist.instagram.toLowerCase()} ${artist.direction.toLowerCase()} vietnam artist" data-instagram-url="${artist.instagramUrl}">
    <div class="thumb">${imageMarkup(artist.image, artist.name, 900, 1200)}<span class="flag">ARTIST</span><button type="button" aria-label="Save ${artist.name}">♡</button></div>
    <div class="market-card-body"><div class="badges"><span>INSTAGRAM</span><span>NEW</span><span>VN</span></div><h3>${artist.name}</h3><p>Vietnam / ${artist.direction} / @${artist.instagram}</p><div class="mini-stats"><span><strong>${formatFollowers(artist.totalFollowers)}</strong>Followers</span><span><strong>—</strong>ER</span></div><strong class="reward">PUBLIC PROFILE</strong></div>
  </article>`).join("");
