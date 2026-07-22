(function () {
  'use strict';

  const STORAGE_KEY = 'kmodu.locale';
  const DEFAULT_LOCALE = 'ko-KR';
  const LOCALES = {
    'ko-KR': { short: 'KR', flag: 'kr', country: '대한민국', language: '한국어', current: '현재' },
    'vi-VN': { short: 'VN', flag: 'vn', country: 'Việt Nam', language: 'Tiếng Việt', current: 'Hiện tại' },
    'zh-TW': { short: 'TW', flag: 'tw', country: '台灣', language: '繁體中文', current: '目前' },
    'en-US': { short: 'US', flag: 'us', country: 'United States', language: 'English', current: 'Current' },
  };
  const ORDER = ['ko-KR', 'vi-VN', 'zh-TW', 'en-US'];

  // [Vietnamese, Traditional Chinese (Taiwan), English]
  // Brand names, creator names, handles and user-entered catalog data intentionally remain unchanged.
  const TEXT = {
    // Shared navigation and actions
    '소개': ['Giới thiệu', '關於我們', 'About'],
    '디자이너': ['Nhà thiết kế', '設計師', 'Designers'],
    '크리에이터': ['Nhà sáng tạo', '創作者', 'Creators'],
    '문의': ['Liên hệ', '聯絡我們', 'Contact'],
    '로그인': ['Đăng nhập', '登入', 'Log in'],
    '로그아웃': ['Đăng xuất', '登出', 'Log out'],
    '입점 신청': ['Đăng ký thương hiệu', '品牌進駐申請', 'Brand application'],
    '뒤로': ['Quay lại', '返回', 'Back'],
    '닫기': ['Đóng', '關閉', 'Close'],
    '확인': ['Xác nhận', '確認', 'Confirm'],
    '다음': ['Tiếp theo', '下一步', 'Next'],
    '이전': ['Trước', '上一步', 'Previous'],
    '초기화': ['Đặt lại', '重設', 'Reset'],
    '검색': ['Tìm kiếm', '搜尋', 'Search'],
    '필터': ['Bộ lọc', '篩選', 'Filter'],
    '정렬': ['Sắp xếp', '排序', 'Sort'],
    '전체': ['Tất cả', '全部', 'All'],
    '준비중': ['Sắp ra mắt', '即將推出', 'Coming soon'],
    '더 보기': ['Xem thêm', '查看更多', 'View more'],
    '내용 보기': ['Xem chi tiết', '查看內容', 'View details'],
    '개': ['mục', '件', 'items'],
    '장': ['ảnh', '張', 'images'],
    '메뉴': ['Menu', '選單', 'Menu'],
    '메뉴 열기': ['Mở menu', '開啟選單', 'Open menu'],
    '언어 선택': ['Chọn ngôn ngữ', '選擇語言', 'Select language'],

    // Home
    '서비스 소개': ['Giới thiệu dịch vụ', '服務介紹', 'Service overview'],
    '디자이너 브랜드 모집': ['Tuyển thương hiệu thiết kế', '招募設計師品牌', 'Designer brand recruitment'],
    '전세계 패션 크리에이터와 협업할 한국 디자이너 브랜드를 모집합니다.': ['Chúng tôi đang tìm kiếm các thương hiệu thiết kế Hàn Quốc muốn hợp tác với nhà sáng tạo thời trang toàn cầu.', '招募希望與全球時尚創作者合作的韓國設計師品牌。', 'We are recruiting Korean designer brands ready to collaborate with global fashion creators.'],
    '디자이너 등록': ['Đăng ký nhà thiết kế', '設計師註冊', 'Register as a designer'],
    'K-MODU는 한국 디자이너 브랜드를 글로벌 패션 크리에이터와 연결하고, 캠페인 브리프를 통해 협업 방향을 정리합니다.': ['K-MODU kết nối thương hiệu thiết kế Hàn Quốc với các nhà sáng tạo thời trang toàn cầu và định hướng hợp tác bằng bản tóm tắt chiến dịch.', 'K-MODU 連結韓國設計師品牌與全球時尚創作者，並透過活動簡報整理合作方向。', 'K-MODU connects Korean designer brands with global fashion creators and structures each collaboration through a campaign brief.'],
    'K-패션의 세계 진출을 위한 글로벌 크리에이터 매칭 플랫폼': ['Nền tảng kết nối nhà sáng tạo toàn cầu đưa K-fashion ra thế giới', '助力 K-Fashion 走向世界的全球創作者媒合平台', 'The global creator matching platform taking K-fashion worldwide'],
    'K-패션과 글로벌 크리에이터를 연결짓는 가장 빠른 길': ['Con đường nhanh nhất kết nối K-fashion với nhà sáng tạo toàn cầu', '連結 K-Fashion 與全球創作者的最快途徑', 'The fastest way to connect K-fashion with global creators'],
    '전 세계 크리에이터가 함께합니다': ['Nhà sáng tạo trên toàn thế giới cùng tham gia', '全球創作者共同參與', 'Creators around the world are with us'],
    '중국': ['Trung Quốc', '中國', 'China'],
    '일본': ['Nhật Bản', '日本', 'Japan'],
    '베트남': ['Việt Nam', '越南', 'Vietnam'],
    '태국': ['Thái Lan', '泰國', 'Thailand'],
    '인도네시아': ['Indonesia', '印尼', 'Indonesia'],
    '말레이시아': ['Malaysia', '馬來西亞', 'Malaysia'],
    '싱가포르': ['Singapore', '新加坡', 'Singapore'],
    '대만': ['Đài Loan', '台灣', 'Taiwan'],
    '미국': ['Hoa Kỳ', '美國', 'United States'],
    '프랑스': ['Pháp', '法國', 'France'],
    '더 보기 →': ['Xem thêm →', '查看更多 →', 'View more →'],
    '추천 핏': ['Độ phù hợp đề xuất', '推薦契合', 'Recommended fit'],
    '팔로워': ['Người theo dõi', '追蹤人數', 'Followers'],
    '평균 조회': ['Lượt xem trung bình', '平均觀看', 'Average views'],
    '상품': ['Sản phẩm', '商品', 'Product'],
    '스토리': ['Câu chuyện', '故事', 'Story'],
    '캠페인': ['Chiến dịch', '活動', 'Campaign'],
    '브리프': ['Bản tóm tắt', '簡報', 'Brief'],
    '스튜디오': ['Studio', '工作室', 'Studio'],
    '카카오': ['Kakao', 'Kakao', 'Kakao'],
    '디자이너 쇼케이스': ['Không gian trưng bày nhà thiết kế', '設計師展示空間', 'Designer showcase'],
    '매칭 점수': ['Điểm phù hợp', '媒合分數', 'Match score'],
    '브랜드 × 크리에이터 핏': ['Độ phù hợp thương hiệu × nhà sáng tạo', '品牌 × 創作者契合度', 'Brand × creator fit'],
    '콘텐츠 스타일': ['Phong cách nội dung', '內容風格', 'Content style'],
    '스트리트부터 에디토리얼까지 이어지는 스타일링, 런칭 영상, 착장 분석, TikTok 룩북 콘텐츠.': ['Nội dung styling từ streetwear đến editorial, video ra mắt, phân tích trang phục và lookbook TikTok.', '涵蓋街頭到編輯風格的造型、上市影片、穿搭分析與 TikTok 型錄內容。', 'Styling from street to editorial, launch videos, outfit analysis and TikTok lookbook content.'],
    '추천 캠페인': ['Chiến dịch đề xuất', '推薦活動', 'Recommended campaigns'],
    '서울 디자이너 발견': ['Khám phá nhà thiết kế Seoul', '發掘首爾設計師', 'Discover Seoul designers'],
    '첫 착장 스타일링': ['Styling trang phục đầu tiên', '首套造型搭配', 'First-look styling'],
    '오디언스 반응': ['Phản hồi khán giả', '受眾反應', 'Audience response'],
    '정돈된 스트리트 럭셔리 스타일링에 반응이 높은 글로벌 패션 오디언스입니다.': ['Nhóm khán giả thời trang toàn cầu phản hồi tốt với phong cách street luxury chỉn chu.', '這群全球時尚受眾對俐落的街頭奢華造型反應良好。', 'A global fashion audience highly responsive to polished street-luxury styling.'],
    '매칭 요청': ['Yêu cầu kết nối', '提出媒合', 'Request a match'],
    '콘텐츠 방향': ['Định hướng nội dung', '內容方向', 'Content direction'],
    '디자이너가 자신의 상품과 브랜드 철학을 함께 소개하는 공간입니다. 룩북, 대표 상품, 창작자 스토리를 하나의 에디토리얼 페이지처럼 정리해 글로벌 크리에이터와 바이어에게 전달합니다.': ['Không gian để nhà thiết kế giới thiệu sản phẩm và triết lý thương hiệu. Lookbook, sản phẩm chủ lực và câu chuyện sáng tạo được biên tập thành một trang editorial dành cho nhà sáng tạo và người mua toàn cầu.', '這是設計師同時介紹商品與品牌理念的空間。型錄、主打商品與創作者故事會被整理成編輯式頁面，傳遞給全球創作者與買家。', 'A space where designers present products and brand philosophy together. Lookbooks, hero products and creator stories are edited into a single editorial page for global creators and buyers.'],
    '브랜드 철학, 디자이너 스토리, 시즌 무드를 정리합니다.': ['Trình bày triết lý thương hiệu, câu chuyện nhà thiết kế và tinh thần mùa.', '整理品牌理念、設計師故事與季度氛圍。', 'Present the brand philosophy, designer story and seasonal mood.'],
    '대표 상품의 소재, 실루엣, 가격대, 스타일링 포인트를 콘텐츠화합니다.': ['Biến chất liệu, phom dáng, mức giá và điểm phối đồ của sản phẩm chủ lực thành nội dung.', '將主打商品的材質、輪廓、價格帶與造型重點內容化。', 'Turn hero-product materials, silhouettes, pricing and styling points into content.'],
    '크리에이터가 바로 콘텐츠를 만들 수 있도록 촬영 포인트와 협업 방향을 제공합니다.': ['Cung cấp điểm nhấn quay chụp và định hướng hợp tác để nhà sáng tạo có thể bắt đầu ngay.', '提供拍攝重點與合作方向，讓創作者能立即製作內容。', 'Provide shoot points and collaboration direction so creators can make content immediately.'],
    'K-MODU는 브랜드 등록부터 크리에이터 매칭과 캠페인 실행까지, 한국 디자이너 브랜드가 글로벌 패션 시장으로 확장되는 과정을 하나의 흐름으로 정리합니다.': ['Từ đăng ký thương hiệu đến kết nối nhà sáng tạo và triển khai chiến dịch, K-MODU gom toàn bộ hành trình mở rộng ra thị trường thời trang toàn cầu vào một quy trình rõ ràng.', '從品牌註冊、創作者媒合到活動執行，K-MODU 將韓國設計師品牌拓展全球時尚市場的過程整合為單一流程。', 'From brand onboarding to creator matching and campaign execution, K-MODU organizes global expansion into one clear flow.'],
    '한국 디자이너 브랜드의 상품, 룩북, 브랜드 스토리를 등록합니다.': ['Đăng tải sản phẩm, lookbook và câu chuyện của thương hiệu thiết kế Hàn Quốc.', '登錄韓國設計師品牌的商品、型錄與品牌故事。', 'Register products, lookbooks and brand stories from Korean designer labels.'],
    'K-MODU가 브랜드를 글로벌 크리에이터용 에디토리얼 페이지로 정리합니다.': ['K-MODU biên tập thương hiệu thành trang editorial dành cho nhà sáng tạo toàn cầu.', 'K-MODU 將品牌整理為面向全球創作者的編輯式頁面。', 'K-MODU edits each brand into an editorial page for global creators.'],
    '글로벌 패션 크리에이터와 무드, 타깃, 성과 데이터를 기준으로 매칭합니다.': ['Kết nối với nhà sáng tạo thời trang toàn cầu dựa trên phong cách, đối tượng và dữ liệu hiệu quả.', '依據氛圍、受眾與成效數據媒合全球時尚創作者。', 'Match global fashion creators using mood, audience and performance data.'],
    '브리프를 기반으로 콘텐츠 협업을 시작합니다.': ['Bắt đầu hợp tác nội dung dựa trên bản tóm tắt.', '依據簡報啟動內容合作。', 'Launch content collaboration from the brief.'],
    'K-MODU가 연결하는 방식': ['Cách K-MODU kết nối', 'K-MODU 的連結方式', 'How K-MODU connects'],
    '브랜드 스토리에서 크리에이터 캠페인까지': ['Từ câu chuyện thương hiệu đến chiến dịch nhà sáng tạo', '從品牌故事到創作者活動', 'From brand story to creator campaign'],
    '브랜드 자료 등록': ['Đăng tải tài liệu thương hiệu', '登錄品牌資料', 'Brand asset onboarding'],
    '에디토리얼 브리프 제작': ['Biên tập bản tóm tắt editorial', '製作編輯式簡報', 'Editorial brief production'],
    '크리에이터 매칭': ['Kết nối nhà sáng tạo', '創作者媒合', 'Creator matching'],
    '캠페인 실행': ['Triển khai chiến dịch', '執行活動', 'Campaign launch'],
    '브랜드 스토리를 크리에이터 캠페인으로': ['Biến câu chuyện thương hiệu thành chiến dịch nhà sáng tạo', '將品牌故事轉化為創作者活動', 'Turn brand stories into creator campaigns'],
    'K-MODU는 한국 디자이너 브랜드의 룩북, 상품, 브랜드 스토리를 글로벌 패션 크리에이터가 바로 이해할 수 있는 캠페인 브리프로 정리합니다.': ['K-MODU biến lookbook, sản phẩm và câu chuyện thương hiệu Hàn Quốc thành bản tóm tắt chiến dịch mà nhà sáng tạo toàn cầu có thể hiểu ngay.', 'K-MODU 將韓國設計師品牌的型錄、商品與品牌故事整理為全球時尚創作者能立即理解的活動簡報。', 'K-MODU turns Korean designer lookbooks, products and stories into campaign briefs global fashion creators can use immediately.'],
    '룩북, 상품 이미지, 브랜드 철학, 대표 상품 정보를 수집합니다.': ['Thu thập lookbook, hình ảnh sản phẩm, triết lý thương hiệu và thông tin sản phẩm chủ lực.', '收集型錄、商品圖片、品牌理念與主打商品資訊。', 'Collect lookbooks, product images, brand philosophy and hero-product information.'],
    '크리에이터가 이해하기 쉬운 글로벌 캠페인 브리프로 정리합니다.': ['Biên tập thành bản tóm tắt chiến dịch toàn cầu dễ hiểu cho nhà sáng tạo.', '整理成創作者易於理解的全球活動簡報。', 'Edit the material into a creator-ready global campaign brief.'],
    '무드, 타깃, 성과 데이터를 기준으로 글로벌 크리에이터를 추천합니다.': ['Đề xuất nhà sáng tạo toàn cầu dựa trên phong cách, đối tượng và dữ liệu hiệu quả.', '依據氛圍、受眾與成效數據推薦全球創作者。', 'Recommend global creators using mood, audience and performance data.'],
    '제품 시딩, 스타일링 콘텐츠, 시장 반응 확인까지 캠페인을 실행합니다.': ['Triển khai chiến dịch từ gửi sản phẩm, nội dung phối đồ đến đo lường phản ứng thị trường.', '執行從商品寄送、造型內容到市場反應確認的完整活動。', 'Run the campaign from product seeding and styling content through market-response reporting.'],
    '브랜드를 연결할 준비가 되셨나요?': ['Bạn đã sẵn sàng kết nối thương hiệu?', '準備好讓品牌開始連結了嗎？', 'Ready to connect your brand?'],
    '글로벌 패션 크리에이터와 함께할 브랜드 캠페인을 시작하세요.': ['Bắt đầu chiến dịch thương hiệu cùng các nhà sáng tạo thời trang toàn cầu.', '與全球時尚創作者一起啟動品牌活動。', 'Start a brand campaign with global fashion creators.'],
    '서울에서 전세계 크리에이터로': ['Từ Seoul đến các nhà sáng tạo toàn cầu', '從首爾走向全球創作者', 'From Seoul to creators worldwide'],
    'New York 기반 패션 크리에이터. 조용한 럭셔리, 스타일링 전환, 디자이너 브랜드 발견에 강점이 있습니다.': ['Nhà sáng tạo thời trang tại New York, nổi bật với quiet luxury, chuyển đổi phong cách và khám phá thương hiệu thiết kế.', '紐約時尚創作者，擅長低調奢華、造型轉換與設計師品牌探索。', 'A New York fashion creator known for quiet luxury, styling transitions and designer discovery.'],
    'LA 기반 크리에이터. 세련된 스트리트 럭셔리 오디언스와 숏폼 스타일링 성과가 좋습니다.': ['Nhà sáng tạo tại LA với tệp khán giả street luxury tinh tế và hiệu quả video phối đồ ngắn nổi bật.', '洛杉磯創作者，擁有精緻街頭奢華受眾，短影音造型表現出色。', 'An LA creator with a refined street-luxury audience and strong short-form styling performance.'],
    '신진 레이블과 런웨이 무드 룩에 대한 오디언스 신뢰가 높은 에디토리얼 패션 크리에이터입니다.': ['Nhà sáng tạo thời trang editorial được khán giả tin tưởng về các nhãn hiệu mới và phong cách runway.', '在新銳品牌與伸展台氛圍造型上深受受眾信任的編輯型時尚創作者。', 'An editorial fashion creator whose audience trusts emerging labels and runway-inspired looks.'],
    '패션 중심 브랜드를 데일리 착장과 구매 의도가 높은 쇼핑 순간으로 풀어내는 크리에이터입니다.': ['Nhà sáng tạo biến thương hiệu thời trang thành trang phục hằng ngày và những khoảnh khắc mua sắm có ý định cao.', '擅長將時尚品牌轉化為日常穿搭與高購買意圖購物情境的創作者。', 'A creator who turns fashion brands into daily outfits and high-intent shopping moments.'],
    'Miami 기반 크리에이터. 리조트 스타일링, 세련된 베이식, 정돈된 데일리 패션 클립에 강점이 있습니다.': ['Nhà sáng tạo tại Miami, nổi bật với resort styling, đồ cơ bản tinh tế và video thời trang hằng ngày chỉn chu.', '邁阿密創作者，擅長度假造型、精緻基本款與俐落日常時尚短片。', 'A Miami creator strong in resort styling, polished basics and refined daily fashion clips.'],
    '한국 패션 실루엣을 실용적인 글로벌 스타일링 내러티브로 풀어내는 크리에이터입니다.': ['Nhà sáng tạo chuyển phom dáng thời trang Hàn Quốc thành câu chuyện phối đồ toàn cầu thiết thực.', '將韓國時尚輪廓轉化為實用全球造型敘事的創作者。', 'A creator who translates Korean fashion silhouettes into practical global styling narratives.'],
    'Brooklyn 기반 패션 크리에이터. 컨셉추얼 실루엣과 신진 레이블에 반응하는 니치 오디언스를 보유합니다.': ['Nhà sáng tạo thời trang tại Brooklyn với tệp khán giả ngách yêu thích phom dáng ý niệm và nhãn hiệu mới.', '布魯克林時尚創作者，擁有喜愛概念輪廓與新銳品牌的利基受眾。', 'A Brooklyn fashion creator with a niche audience responsive to conceptual silhouettes and emerging labels.'],
    '캡슐 워드로브와 데일리 착장 시스템에서 저장 반응이 좋은 스마트 캐주얼 패션 크리에이터입니다.': ['Nhà sáng tạo smart casual có tỷ lệ lưu cao với nội dung tủ đồ capsule và hệ thống trang phục hằng ngày.', '在膠囊衣櫥與日常穿搭系統內容中擁有高收藏反應的智慧休閒創作者。', 'A smart-casual creator with strong saves on capsule wardrobes and daily outfit systems.'],
    '주식회사 마크브릿지': ['Công ty MARKBRIDGE', 'MARKBRIDGE 股份有限公司', 'MARKBRIDGE Co., Ltd.'],
    '대표자 고정희': ['Đại diện: Jeonghui Ko', '代表人：高正姬', 'CEO: Jeonghui Ko'],
    '사업자등록번호 236-87-03913': ['Mã đăng ký kinh doanh 236-87-03913', '營業登記號碼 236-87-03913', 'Business Registration No. 236-87-03913'],
    '법인등록번호 200111-0077166': ['Mã đăng ký pháp nhân 200111-0077166', '公司登記號碼 200111-0077166', 'Corporate Registration No. 200111-0077166'],
    '광주광역시 서구 상무중앙로78번길 5-6,': ['5-6 Sangmujungang-ro 78beon-gil, Seo-gu, Gwangju,', '韓國光州廣域市西區尚武中央路78番街 5-6，', '5-6 Sangmujungang-ro 78beon-gil, Seo-gu, Gwangju,'],
    '9층 901호 내 153호': ['Tầng 9, phòng 901, đơn vị 153', '9 樓 901 室內 153 號', '9F, Room 901, Unit 153'],
    '개인정보처리방침': ['Chính sách quyền riêng tư', '隱私權政策', 'Privacy Policy'],
    '이용약관': ['Điều khoản sử dụng', '使用條款', 'Terms of Use'],
    '디자이너 관리자': ['Quản trị nhà thiết kế', '設計師管理', 'Designer admin'],

    // Creators board
    'Verified creators for Korean fashion brands.': ['Nhà sáng tạo đã xác minh cho thương hiệu thời trang Hàn Quốc.', '為韓國時尚品牌嚴選的認證創作者。', 'Verified creators for Korean fashion brands.'],
    'Verified creators for': ['Nhà sáng tạo đã xác minh dành cho', '專為以下品牌嚴選的認證創作者', 'Verified creators for'],
    'Korean fashion brands.': ['thương hiệu thời trang Hàn Quốc.', '韓國時尚品牌。', 'Korean fashion brands.'],
    'K-MODU는 글로벌 크리에이터의 스타일, 오디언스, 콘텐츠 포맷, 브랜드 핏을 기준으로 한국 디자이너 브랜드에 맞는 캠페인 파트너를 선별합니다.': ['K-MODU tuyển chọn đối tác chiến dịch phù hợp cho thương hiệu thiết kế Hàn Quốc dựa trên phong cách, khán giả, định dạng nội dung và độ phù hợp thương hiệu.', 'K-MODU 依據全球創作者的風格、受眾、內容形式與品牌契合度，為韓國設計師品牌篩選合適的活動夥伴。', 'K-MODU selects campaign partners for Korean designer brands based on creator style, audience, content format and brand fit.'],
    '모든 검증 크리에이터': ['Tất cả nhà sáng tạo đã xác minh', '所有認證創作者', 'All verified creators'],
    '패션 크리에이터': ['Nhà sáng tạo thời trang', '時尚創作者', 'Fashion creators'],
    '룩북, 스타일링, 데일리핏': ['Lookbook, phối đồ, trang phục hằng ngày', '型錄、造型、日常穿搭', 'Lookbooks, styling and daily fits'],
    '숏폼 전환과 바이럴': ['Video ngắn và lan truyền', '短影音轉換與擴散', 'Short-form conversion and virality'],
    '비주얼 무드와 저장률': ['Phong cách hình ảnh và tỷ lệ lưu', '視覺氛圍與收藏率', 'Visual mood and save rate'],
    '리뷰, 하울, 착장 분석': ['Đánh giá, haul, phân tích trang phục', '評測、開箱、穿搭解析', 'Reviews, hauls and outfit analysis'],
    'K-브랜드 이해도 높은 그룹': ['Nhóm am hiểu thương hiệu K', '高度理解韓國品牌的族群', 'K-brand fluent creators'],
    '검증 크리에이터 통합 도달 규모': ['Tổng lượng tiếp cận của nhà sáng tạo đã xác minh', '認證創作者總觸及規模', 'Total verified creator reach'],
    '브랜드 협업이 가능한 가입 크리에이터': ['Nhà sáng tạo đã đăng ký và sẵn sàng hợp tác', '已加入且可合作的創作者', 'Registered creators available for brand collaborations'],
    '신규 등록': ['Mới đăng ký', '新加入', 'New'],
    '모집중': ['Đang tuyển', '招募中', 'Open'],
    '마감임박': ['Sắp kết thúc', '即將截止', 'Closing soon'],
    '80% 이상': ['Từ 80%', '80% 以上', '80%+'],
    '85% 이상': ['Từ 85%', '85% 以上', '85%+'],
    '90% 이상': ['Từ 90%', '90% 以上', '90%+'],
    '추천 협업 형태': ['Hình thức hợp tác đề xuất', '推薦合作形式', 'Recommended collaboration formats'],
    '협업 진행 단계': ['Quy trình hợp tác', '合作流程', 'Collaboration process'],
    '제안 발송': ['Gửi đề xuất', '發送提案', 'Send proposal'],
    '브랜드가 크리에이터에게 협업 제안을 보냅니다.': ['Thương hiệu gửi đề xuất hợp tác đến nhà sáng tạo.', '品牌向創作者發送合作提案。', 'The brand sends a collaboration proposal to the creator.'],
    '크리에이터 매칭': ['Kết nối nhà sáng tạo', '創作者媒合', 'Creator matching'],
    '수락 시 캠페인 조건과 일정을 조율합니다.': ['Khi được chấp nhận, hai bên thống nhất điều kiện và lịch chiến dịch.', '接受後協調活動條件與時程。', 'Once accepted, campaign terms and timing are coordinated.'],
    '콘텐츠 제작': ['Sản xuất nội dung', '內容製作', 'Content production'],
    '가이드라인 기반으로 자유롭게 제작합니다.': ['Sáng tạo tự do dựa trên hướng dẫn đã thống nhất.', '依據指南自由製作內容。', 'Create freely within the agreed guidelines.'],
    '발행 & 리포트': ['Đăng tải & báo cáo', '發布與報告', 'Publish & report'],
    '업로드 후 성과 리포트를 공유합니다.': ['Chia sẻ báo cáo hiệu quả sau khi đăng tải.', '發布後分享成效報告。', 'Share a performance report after publishing.'],
    '협업 안내': ['Hướng dẫn hợp tác', '合作說明', 'Collaboration notes'],
    '제공된 가이드라인과 콘텐츠를 활용한 자유로운 제작 방식입니다.': ['Nhà sáng tạo được tự do sản xuất dựa trên nội dung và hướng dẫn đã cung cấp.', '可運用提供的指南與素材自由製作。', 'Creators can work freely using the provided guidelines and content.'],
    '발행 전 콘텐츠 컨펌 절차가 있을 수 있습니다.': ['Có thể có bước duyệt nội dung trước khi đăng.', '發布前可能需要內容確認。', 'Content approval may be required before publishing.'],
    '연락처 등 개인정보는 매칭 확정 후에만 공유됩니다.': ['Thông tin cá nhân như liên hệ chỉ được chia sẻ sau khi xác nhận kết nối.', '聯絡方式等個人資訊僅在媒合確認後分享。', 'Personal information such as contact details is shared only after a match is confirmed.'],
    '이 크리에이터에게 제안하기': ['Đề xuất hợp tác với nhà sáng tạo này', '向此創作者提出合作', 'Propose to this creator'],
    '디자이너 브랜드 보드 보기 →': ['Xem bảng thương hiệu thiết kế →', '查看設計師品牌看板 →', 'View designer brand board →'],
    '협업 제안': ['Đề xuất hợp tác', '合作提案', 'Collaboration proposal'],
    '제안은 K-MODU 운영팀이 먼저 확인합니다. 크리에이터 의사와 조건을 확인한 뒤 담당자에게 연락드립니다.': ['Đội ngũ K-MODU sẽ xem xét đề xuất trước, xác nhận mong muốn và điều kiện của nhà sáng tạo rồi liên hệ với bạn.', 'K-MODU 營運團隊會先審核提案，確認創作者意願與條件後再與負責人聯繫。', 'The K-MODU team reviews each proposal first, confirms the creator’s interest and terms, then contacts your representative.'],
    '제안 접수': ['Tiếp nhận đề xuất', '收到提案', 'Proposal received'],
    '운영팀 검토': ['Đội ngũ xem xét', '營運團隊審核', 'Team review'],
    '조건 조율': ['Thống nhất điều kiện', '協調條件', 'Terms coordination'],
    '브랜드명 *': ['Tên thương hiệu *', '品牌名稱 *', 'Brand name *'],
    '담당자명 *': ['Người phụ trách *', '負責人姓名 *', 'Contact person *'],
    '연락처 *': ['Thông tin liên hệ *', '聯絡方式 *', 'Contact *'],
    '협업 형태 *': ['Hình thức hợp tác *', '合作形式 *', 'Collaboration type *'],
    '예산 범위': ['Ngân sách dự kiến', '預算範圍', 'Budget range'],
    '제안 내용 *': ['Nội dung đề xuất *', '提案內容 *', 'Proposal details *'],
    '제품 시딩': ['Gửi sản phẩm', '商品寄送', 'Product seeding'],
    '스타일링 콘텐츠': ['Nội dung phối đồ', '造型內容', 'Styling content'],
    '브랜드 캠페인': ['Chiến dịch thương hiệu', '品牌活動', 'Brand campaign'],
    '장기 파트너십': ['Hợp tác dài hạn', '長期合作', 'Long-term partnership'],
    '제안 처리에 필요한 개인정보 수집·이용에 동의합니다.': ['Tôi đồng ý cho thu thập và sử dụng thông tin cá nhân cần thiết để xử lý đề xuất.', '我同意蒐集與使用處理提案所需的個人資訊。', 'I consent to the collection and use of personal information required to process this proposal.'],
    '운영팀에 제안 접수하기': ['Gửi đề xuất đến đội ngũ K-MODU', '提交提案給營運團隊', 'Submit proposal to the K-MODU team'],
    '협업 제안이 접수되었습니다.': ['Đã tiếp nhận đề xuất hợp tác.', '合作提案已送出。', 'Your collaboration proposal has been received.'],
    'K-MODU 운영팀이 내용을 확인한 뒤 입력하신 연락처로 안내드립니다.': ['Đội ngũ K-MODU sẽ xem xét và liên hệ qua thông tin bạn đã cung cấp.', 'K-MODU 營運團隊確認內容後，會透過您填寫的聯絡方式通知。', 'The K-MODU team will review the details and contact you using the information provided.'],
    '에게': [' · ', '的', ' · '],
    '이름 · 도시 · 스타일 검색': ['Tìm theo tên · thành phố · phong cách', '搜尋姓名・城市・風格', 'Search name · city · style'],
    '브랜드 또는 회사명': ['Tên thương hiệu hoặc công ty', '品牌或公司名稱', 'Brand or company name'],
    '담당자 이름': ['Tên người phụ trách', '負責人姓名', 'Contact person name'],
    '이메일 · 전화번호 · @SNS 계정': ['Email · số điện thoại · tài khoản @SNS', '電子郵件・電話・@社群帳號', 'Email · phone · @social handle'],
    '예: 100~200만원 / 협의': ['VD: 20–40 triệu VND / thương lượng', '例：預算區間／可議', 'e.g. budget range / negotiable'],
    '제품, 콘텐츠 형태, 일정, 희망 업로드 채널을 알려주세요.': ['Hãy cho chúng tôi biết sản phẩm, định dạng nội dung, lịch trình và kênh đăng tải mong muốn.', '請告訴我們商品、內容形式、時程與希望發布的頻道。', 'Tell us about the product, content format, schedule and preferred publishing channel.'],

    // Designers board and modal
    'Designer Profiles Ready For Creators': ['Hồ sơ nhà thiết kế sẵn sàng cho nhà sáng tạo', '為創作者準備完成的設計師檔案', 'Designer Profiles Ready For Creators'],
    '한국 디자이너 브랜드의 대표 룩, 시즌 무드, 협업 가능 포맷을 한눈에 볼 수 있는 프로필 보드입니다. 크리에이터는 브랜드 감도와 콘텐츠 방향을 보고 바로 협업을 제안할 수 있습니다.': ['Bảng hồ sơ cho phép xem nhanh diện mạo chủ đạo, tinh thần mùa và hình thức hợp tác của thương hiệu thiết kế Hàn Quốc. Nhà sáng tạo có thể xem phong cách thương hiệu và đề xuất hợp tác ngay.', '此檔案看板可一覽韓國設計師品牌的代表造型、季度氛圍與可合作形式。創作者能依品牌調性與內容方向直接提出合作。', 'A profile board showing each Korean designer brand’s key looks, seasonal mood and collaboration formats at a glance. Creators can review the direction and propose a collaboration immediately.'],
    'K-MODU에 입점한 디자이너 브랜드': ['Thương hiệu thiết kế trên K-MODU', '進駐 K-MODU 的設計師品牌', 'Designer brands on K-MODU'],
    '디자이너 보유': ['Thương hiệu thiết kế', '設計師品牌', 'Designer brands'],
    '협업과 AI 스타일링에 등록된 상품': ['Sản phẩm đăng ký cho hợp tác và phối đồ AI', '已登錄於合作與 AI 造型的商品', 'Products registered for collaboration and AI styling'],
    '공개 승인된 AI 룩 이미지': ['Hình ảnh AI look đã được duyệt công khai', '已核准公開的 AI 造型圖片', 'Publicly approved AI look images'],
    '선택한 디자이너 브랜드의 대표 룩과 시즌 무드를 확인하세요.': ['Khám phá diện mạo chủ đạo và tinh thần mùa của thương hiệu đã chọn.', '查看所選設計師品牌的代表造型與季度氛圍。', 'Explore the selected designer brand’s key looks and seasonal mood.'],
    '프로필': ['Hồ sơ', '檔案', 'Profile'],
    '스타일링 보드': ['Bảng phối đồ', '造型看板', 'Styling board'],
    '협업 준비': ['Sẵn sàng hợp tác', '合作準備', 'Collaboration ready'],
    '대표 이미지와 이어지는 룩북 컷을 순차적으로 보여줍니다.': ['Hiển thị lần lượt ảnh đại diện và các khung hình lookbook liên quan.', '依序顯示主圖與延伸的型錄照片。', 'Show the hero image followed by related lookbook frames.'],
    '브랜드가 보유한 제품과 추천 아이템을 조합해 크리에이터가 바로 촬영 콘셉트를 상상할 수 있는 보드입니다.': ['Kết hợp sản phẩm của thương hiệu với các món đề xuất để nhà sáng tạo có thể hình dung ngay ý tưởng quay chụp.', '結合品牌自有商品與推薦單品，讓創作者能立即想像拍攝概念。', 'Combine brand-owned products with recommended items so creators can immediately imagine a shoot concept.'],
    '보유 제품': ['Sản phẩm có sẵn', '現有商品', 'Owned products'],
    '추천 아이템': ['Món đồ đề xuất', '推薦單品', 'Recommended items'],
    '상의': ['Áo', '上身', 'Tops'],
    '하의': ['Quần/Váy', '下身', 'Bottoms'],
    '악세서리': ['Phụ kiện', '配件', 'Accessories'],
    'K-패션 여성': ['Nữ K-fashion', 'K-Fashion 女裝', 'K-fashion women'],
    '스트리트': ['Đường phố', '街頭', 'Street'],
    '제품을 선택해 모델 착장 룩을 생성하세요.': ['Chọn sản phẩm để tạo hình ảnh người mẫu phối đồ.', '選擇商品以生成模特兒穿搭造型。', 'Select products to generate a styled model look.'],
    'AI 룩 생성': ['Tạo AI look', '生成 AI 造型', 'Generate AI look'],
    '제품을 1개 이상 선택하고 룩을 생성하세요.': ['Chọn ít nhất một sản phẩm để tạo look.', '請至少選擇一件商品後生成造型。', 'Select at least one product to generate a look.'],
    '먼저 AI 룩을 생성하면 숏폼 영상을 만들 수 있어요.': ['Tạo AI look trước để làm video ngắn.', '先生成 AI 造型，即可製作短影音。', 'Generate an AI look first to create a short-form video.'],
    '샘플 요청 · 협업 제안 보내기': ['Gửi yêu cầu mẫu · đề xuất hợp tác', '發送樣品申請・合作提案', 'Send sample request · collaboration proposal'],
    '브랜드 디자이너에게 바로 전달돼요. 연락처를 남기면 디자이너가 회신해요.': ['Yêu cầu được gửi trực tiếp đến nhà thiết kế. Hãy để lại thông tin liên hệ để nhận phản hồi.', '內容會直接送達品牌設計師；留下聯絡方式後，設計師會回覆。', 'Your request goes directly to the brand designer. Leave contact details to receive a reply.'],
    '샘플 요청': ['Yêu cầu mẫu', '申請樣品', 'Sample request'],
    '보내기': ['Gửi', '送出', 'Send'],
    '이 브랜드와 협업하기': ['Hợp tác với thương hiệu này', '與此品牌合作', 'Collaborate with this brand'],
    '크리에이터 매칭 보드 보기 →': ['Xem bảng kết nối nhà sáng tạo →', '查看創作者媒合看板 →', 'View creator matching board →'],
    'AI 알림': ['Thông báo AI', 'AI 通知', 'AI notice'],
    '상태를 확인해주세요.': ['Vui lòng kiểm tra trạng thái.', '請確認狀態。', 'Please check the status.'],
    '국가 선택': ['Chọn quốc gia', '選擇國家', 'Select country'],
    '플랫폼 선택': ['Chọn nền tảng', '選擇平台', 'Select platform'],
    '내 채널에 등록': ['Đăng lên kênh của tôi', '發布到我的頻道', 'Publish to my channel'],
    '이름 또는 채널명': ['Tên hoặc tên kênh', '姓名或頻道名稱', 'Name or channel'],
    '이메일 또는 인스타그램 @아이디': ['Email hoặc @Instagram', '電子郵件或 Instagram @帳號', 'Email or Instagram @handle'],
    '원하는 협업 방향을 간단히 알려주세요 (선택)': ['Mô tả ngắn gọn hướng hợp tác mong muốn (không bắt buộc)', '簡述希望的合作方向（選填）', 'Briefly describe the collaboration you want (optional)'],

    // Application and completion
    '입점 신청하실 브랜드의': ['Về thương hiệu bạn muốn đăng ký', '關於您要申請進駐的品牌', 'About the brand you are applying for'],
    '기본 정체성을 입력해 주세요.': ['Hãy nhập thông tin nhận diện cơ bản.', '請輸入基本品牌資訊。', 'Enter the basic brand identity.'],
    '글로벌 매칭의 기초 정보가 될 브랜드명과 디자이너의 실명 정보를 알려주세요.': ['Cung cấp tên thương hiệu và tên thật của nhà thiết kế để làm thông tin nền tảng cho kết nối toàn cầu.', '請提供品牌名稱與設計師真實姓名，作為全球媒合的基礎資訊。', 'Provide the brand name and designer’s legal name as the foundation for global matching.'],
    '브랜드명': ['Tên thương hiệu', '品牌名稱', 'Brand name'],
    '디자이너 실명': ['Tên thật nhà thiết kế', '設計師真實姓名', 'Designer’s legal name'],
    '크리에이터와 소통할': ['Để giao tiếp với nhà sáng tạo', '用於與創作者聯繫', 'For creator communication'],
    '연락처와 슬로건을 공유해 주세요.': ['Hãy chia sẻ thông tin liên hệ và thông điệp thương hiệu.', '請提供聯絡方式與品牌標語。', 'Share your contact details and brand message.'],
    '원활한 소통을 위한 이메일과, 브랜드를 해외시장에 소개할 매력적인 소개글을 입력해 주세요.': ['Nhập email liên hệ và phần giới thiệu hấp dẫn để đưa thương hiệu ra thị trường quốc tế.', '請輸入聯絡信箱，以及能向海外市場介紹品牌的吸引人文案。', 'Enter a contact email and a compelling introduction for overseas markets.'],
    '연락용 이메일': ['Email liên hệ', '聯絡信箱', 'Contact email'],
    '연락용 전화번호': ['Số điện thoại liên hệ', '聯絡電話', 'Contact phone'],
    '브랜드 한 줄 소개': ['Giới thiệu thương hiệu một câu', '一句品牌介紹', 'One-line brand introduction'],
    '원하는 크리에이터 무드를 골라주세요.': ['Chọn phong cách nhà sáng tạo bạn mong muốn.', '請選擇希望合作的創作者風格。', 'Choose your preferred creator mood.'],
    '희망 크리에이터 타입': ['Loại nhà sáng tạo mong muốn', '理想創作者類型', 'Preferred creator type'],
    '마지막이에요! 캠페인 목표와': ['Bước cuối! Hãy chọn mục tiêu chiến dịch và', '最後一步！請選擇活動目標與', 'Last step! Choose your campaign goals and'],
    '캠페인 최종 목표': ['Mục tiêu cuối của chiến dịch', '活動最終目標', 'Campaign objective'],
    '브랜드 인지도 확보': ['Tăng nhận diện thương hiệu', '提升品牌知名度', 'Build brand awareness'],
    '인플루언서 협찬': ['Hợp tác tài trợ influencer', '網紅合作贊助', 'Influencer sponsorship'],
    '신제품 런칭': ['Ra mắt sản phẩm mới', '新品上市', 'New product launch'],
    '해외시장 컨택': ['Tiếp cận thị trường quốc tế', '接觸海外市場', 'Reach overseas markets'],
    '쇼룸 노출': ['Hiển thị showroom', '展示間曝光', 'Showroom exposure'],
    '바이어 매칭': ['Kết nối buyer', '買家媒合', 'Buyer matching'],
    'TikTok 콘텐츠 확보': ['Tạo nội dung TikTok', '取得 TikTok 內容', 'Secure TikTok content'],
    '작성 중이던 정보가 있어요': ['Bạn có bản đăng ký đang viết dở', '您有尚未完成的資料', 'You have an unfinished application'],
    '이전에 입력하시던 임시 저장본이 존재합니다.': ['Đã tìm thấy bản nháp đã lưu trước đó.', '發現先前儲存的草稿。', 'A previously saved draft was found.'],
    '이어서 작성을 완료하시겠습니까?': ['Bạn có muốn tiếp tục hoàn thành không?', '要繼續完成申請嗎？', 'Would you like to continue?'],
    '이어서 작성하기': ['Tiếp tục', '繼續填寫', 'Continue'],
    '새로 작성하기': ['Bắt đầu lại', '重新填寫', 'Start over'],
    '디자이너 스튜디오가': ['Studio nhà thiết kế', '設計師工作室', 'Your designer studio'],
    '바로 열렸습니다.': ['đã sẵn sàng.', '已立即開通。', 'is now open.'],
    '신청 즉시 이용할 수 있어요. 아래': ['Bạn có thể sử dụng ngay sau khi đăng ký. Nhấn', '申請後即可立即使用。請點選下方', 'You can use it immediately after applying. Select'],
    '을 눌러 브랜드 사진과 상품을 등록하고 AI 룩을 만들어보세요.': ['để đăng ảnh thương hiệu, sản phẩm và tạo AI look.', '以上傳品牌照片與商品並製作 AI 造型。', 'to upload brand photos and products, then create an AI look.'],
    '디자이너 스튜디오 입장': ['Vào studio nhà thiết kế', '進入設計師工作室', 'Enter designer studio'],
    '바로 시작하기': ['Bắt đầu ngay', '立即開始', 'Start now'],
    '보유 상품 등록': ['Đăng sản phẩm', '登錄現有商品', 'Register products'],
    '메인 커버 사진 올리기': ['Tải ảnh bìa chính', '上傳主封面圖片', 'Upload main cover'],
    'AI 룩·숏폼 만들기': ['Tạo AI look · video ngắn', '製作 AI 造型・短影音', 'Create AI looks · short-form'],
    '홈으로 돌아가기': ['Về trang chủ', '返回首頁', 'Return home'],

    // Login
    '디자이너 스튜디오': ['Studio nhà thiết kế', '設計師工作室', 'Designer Studio'],
    '한국 패션을': ['Thời trang Hàn Quốc', '韓國時尚', 'Korean fashion'],
    '세계와 연결합니다.': ['kết nối với thế giới.', '連結世界。', 'connects with the world.'],
    '디자이너 브랜드의 룩북 제작부터 글로벌 크리에이터 협업까지.': ['Từ sản xuất lookbook cho thương hiệu thiết kế đến hợp tác với nhà sáng tạo toàn cầu.', '從設計師品牌型錄製作到全球創作者合作。', 'From designer-brand lookbooks to global creator collaborations.'],
    '당신의 브랜드를 세계에 소개하세요.': ['Giới thiệu thương hiệu của bạn với thế giới.', '向世界介紹您的品牌。', 'Introduce your brand to the world.'],
    '로그인 후 브랜드 등록과 AI 룩북 제작을 시작할 수 있습니다.': ['Đăng nhập để đăng ký thương hiệu và bắt đầu tạo AI lookbook.', '登入後即可註冊品牌並開始製作 AI 型錄。', 'Log in to register your brand and start creating AI lookbooks.'],
    'Google로 계속하기': ['Tiếp tục với Google', '使用 Google 繼續', 'Continue with Google'],
    'Google로 시작하기': ['Bắt đầu với Google', '使用 Google 開始', 'Get started with Google'],
    '로그인 상태를 확인하는 중…': ['Đang kiểm tra trạng thái đăng nhập…', '正在確認登入狀態…', 'Checking your sign-in status…'],
    '처음이라면 로그인 후 디자이너 등록 신청으로 바로 이어져요. 승인되면 같은 계정으로 스튜디오가 열립니다.': ['Nếu đây là lần đầu, sau khi đăng nhập bạn sẽ được chuyển thẳng đến đơn đăng ký nhà thiết kế. Khi được duyệt, studio sẽ mở bằng cùng tài khoản.', '首次使用時，登入後會直接前往設計師註冊申請。核准後即可使用同一帳號開啟工作室。', 'First time here? After signing in, you will continue directly to the designer application. Once approved, the studio opens with the same account.'],
    '구글 로그인이 아직 설정되지 않았어요. 관리자에게 문의해주세요.': ['Đăng nhập Google chưa được thiết lập. Vui lòng liên hệ quản trị viên.', 'Google 登入尚未設定，請聯絡管理員。', 'Google sign-in is not configured yet. Please contact the administrator.'],
    '✓ 로그인됨': ['✓ Đã đăng nhập', '✓ 已登入', '✓ Signed in'],
    '관리자 계정으로 로그인되어 있어요.': ['Bạn đang đăng nhập bằng tài khoản quản trị viên.', '您目前使用管理員帳號登入。', 'You are signed in with an administrator account.'],
    '관리자 콘솔 열기': ['Mở bảng điều khiển quản trị', '開啟管理員控制台', 'Open admin console'],
    '디자이너 스튜디오 열기': ['Mở studio nhà thiết kế', '開啟設計師工作室', 'Open designer studio'],
    '내 브랜드 등록하고 스튜디오 열기': ['Đăng ký thương hiệu và mở studio', '註冊我的品牌並開啟工作室', 'Register my brand and open the studio'],
    '로그아웃하고 다른 계정으로 로그인': ['Đăng xuất và dùng tài khoản khác', '登出並使用其他帳號登入', 'Sign out and use another account'],
    '외부 브라우저로 열어주세요': ['Vui lòng mở bằng trình duyệt ngoài', '請使用外部瀏覽器開啟', 'Please open in an external browser'],
    '링크 복사하기': ['Sao chép liên kết', '複製連結', 'Copy link'],
    '및': ['và', '及', 'and'],
    '계속 진행하면': ['Khi tiếp tục, bạn đồng ý với', '繼續即表示您同意', 'By continuing, you agree to the'],
    '에 동의하는 것으로 간주됩니다.': ['.', '。', '.'],

    // Legal
    '1. 수집하는 개인정보': ['1. Thông tin cá nhân được thu thập', '1. 蒐集的個人資料', '1. Personal information collected'],
    '2. 개인정보 이용 목적': ['2. Mục đích sử dụng thông tin cá nhân', '2. 個人資料使用目的', '2. Purpose of use'],
    '3. 보유 및 이용 기간': ['3. Thời gian lưu trữ và sử dụng', '3. 保存與使用期間', '3. Retention period'],
    '4. 제3자 제공 및 위탁': ['4. Chia sẻ và ủy thác cho bên thứ ba', '4. 第三方提供與委託', '4. Third-party sharing and processing'],
    '5. 이용자의 권리': ['5. Quyền của người dùng', '5. 使用者權利', '5. User rights'],
    '6. 문의': ['6. Liên hệ', '6. 聯絡方式', '6. Contact'],
    'K-MODU(케이모두)를 운영하는 주식회사 마크브릿지는 이용자의 개인정보를 안전하게 관리하기 위해 관련 법령을 준수합니다.': ['MARKBRIDGE Co., Ltd., đơn vị vận hành K-MODU, tuân thủ pháp luật liên quan để bảo vệ thông tin cá nhân của người dùng.', '營運 K-MODU 的 MARKBRIDGE 股份有限公司遵守相關法規，以安全管理使用者個人資料。', 'MARKBRIDGE Co., Ltd., operator of K-MODU, complies with applicable laws to protect users’ personal information.'],
    '서비스 신청, 문의, 디자이너 계정 운영 과정에서 이름, 브랜드명, 이메일, 연락처, 포트폴리오 및 제출 자료를 수집할 수 있습니다.': ['Trong quá trình đăng ký dịch vụ, liên hệ và vận hành tài khoản, chúng tôi có thể thu thập tên, thương hiệu, email, thông tin liên hệ, portfolio và tài liệu đã gửi.', '在服務申請、諮詢與設計師帳號營運過程中，可能蒐集姓名、品牌名稱、電子郵件、聯絡方式、作品集及提交資料。', 'We may collect names, brand names, email addresses, contact information, portfolios and submitted materials during applications, inquiries and account operation.'],
    '수집한 정보는 신청 검토, 본인 확인, 서비스 제공, 협업 제안, 고객 문의 응대, 공지 전달 및 서비스 개선을 위해 이용합니다.': ['Thông tin được sử dụng để xét duyệt đăng ký, xác minh danh tính, cung cấp dịch vụ, xử lý đề xuất hợp tác, hỗ trợ khách hàng, gửi thông báo và cải thiện dịch vụ.', '所蒐集資訊將用於申請審核、身分確認、服務提供、合作提案、客服回覆、通知與服務改善。', 'Collected information is used for application review, identity verification, service delivery, collaboration proposals, customer support, notices and service improvement.'],
    '개인정보는 이용 목적 달성 후 지체 없이 파기합니다. 단, 관계 법령에 따라 보존이 필요한 정보는 해당 기간 동안 보관할 수 있습니다.': ['Thông tin cá nhân được hủy khi mục đích sử dụng đã hoàn thành, trừ trường hợp pháp luật yêu cầu lưu giữ trong một thời hạn nhất định.', '個人資料於使用目的達成後立即銷毀；依法需保存者，將於法定期間內保存。', 'Personal information is deleted once its purpose has been fulfilled, except where retention is required by law.'],
    '개인정보 관련 문의는 hello@markbridge.co 로 연락해 주세요.': ['Vui lòng liên hệ hello@markbridge.co về các vấn đề quyền riêng tư.', '個人資料相關問題請聯絡 hello@markbridge.co。', 'For privacy inquiries, contact hello@markbridge.co.'],
    '1. 목적': ['1. Mục đích', '1. 目的', '1. Purpose'],
    '2. 서비스 내용': ['2. Nội dung dịch vụ', '2. 服務內容', '2. Services'],
    '3. 이용자의 의무': ['3. Nghĩa vụ của người dùng', '3. 使用者義務', '3. User obligations'],
    '4. 지식재산권': ['4. Quyền sở hữu trí tuệ', '4. 智慧財產權', '4. Intellectual property'],
    '5. 서비스 변경 및 중단': ['5. Thay đổi và tạm ngừng dịch vụ', '5. 服務變更與中止', '5. Service changes and suspension'],
    '본 약관은 K-MODU(케이모두)를 운영하는 주식회사 마크브릿지가 제공하는 서비스의 이용 조건과 절차를 정합니다.': ['Các điều khoản này quy định điều kiện và quy trình sử dụng dịch vụ do MARKBRIDGE Co., Ltd., đơn vị vận hành K-MODU, cung cấp.', '本條款規範營運 K-MODU 的 MARKBRIDGE 股份有限公司所提供服務之使用條件與程序。', 'These terms set the conditions and procedures for services provided by MARKBRIDGE Co., Ltd., operator of K-MODU.'],
    '시행일: 2026년 6월 17일': ['Ngày hiệu lực: 17 tháng 6 năm 2026', '生效日：2026 年 6 月 17 日', 'Effective date: June 17, 2026'],

    // Frequently used English interface text
    'Total Followers': ['Tổng người theo dõi', '總追蹤人數', 'Total Followers'],
    'Registered Creators': ['Nhà sáng tạo đã đăng ký', '已註冊創作者', 'Registered Creators'],
    'Followers': ['Người theo dõi', '追蹤人數', 'Followers'],
    'Total': ['Tổng', '總計', 'Total'],
    'Creator Market': ['Thị trường nhà sáng tạo', '創作者市場', 'Creator Market'],
    'Designer Brands': ['Thương hiệu thiết kế', '設計師品牌', 'Designer Brands'],
    'Global Creator Network': ['Mạng lưới nhà sáng tạo toàn cầu', '全球創作者網絡', 'Global Creator Network'],
    'AI Generated Images': ['Hình ảnh tạo bởi AI', 'AI 生成圖片', 'AI Generated Images'],
    'Orders': ['Đơn hàng', '訂單', 'Orders'],
    'Influencer Followers': ['Người theo dõi influencer', '網紅追蹤人數', 'Influencer Followers'],
    'Revenue': ['Doanh thu', '營收', 'Revenue'],
    'Featured Designer': ['Nhà thiết kế nổi bật', '精選設計師', 'Featured Designer'],
    'How It Works': ['Cách hoạt động', '運作方式', 'How It Works'],
    'Brand Onboarding': ['Đăng ký thương hiệu', '品牌上線', 'Brand Onboarding'],
    'Editorial Packaging': ['Biên tập editorial', '編輯式包裝', 'Editorial Packaging'],
    'Campaign Launch': ['Khởi động chiến dịch', '活動啟動', 'Campaign Launch'],
    'Campaign Ready Assets': ['Tài nguyên sẵn sàng cho chiến dịch', '活動就緒素材', 'Campaign Ready Assets'],
    'Portfolio Preview': ['Xem trước portfolio', '作品集預覽', 'Portfolio Preview'],
    'Hero Products': ['Sản phẩm chủ lực', '主打商品', 'Hero Products'],
    'Available Samples': ['Mẫu có sẵn', '可提供樣品', 'Available Samples'],
    'Collaboration Ready': ['Sẵn sàng hợp tác', '合作就緒', 'Collaboration Ready'],
    'Creator Direction': ['Định hướng nhà sáng tạo', '創作者方向', 'Creator Direction'],
  };

  const INDEX = { 'vi-VN': 0, 'zh-TW': 1, 'en-US': 2 };
  const originalText = new WeakMap();
  const originalAttrs = new WeakMap();
  let locale = readLocale();
  let observer;
  let applying = false;

  function readLocale() {
    try {
      const query = new URLSearchParams(location.search).get('lang');
      if (query && LOCALES[query]) return query;
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && LOCALES[saved]) return saved;
    } catch (_) {}
    return DEFAULT_LOCALE;
  }

  function translated(source, targetLocale) {
    if (targetLocale === DEFAULT_LOCALE) return source;
    const lookupSource = source.replace(/\s+/g, ' ');
    const row = TEXT[lookupSource];
    if (row) return row[INDEX[targetLocale]] || source;

    let match = lookupSource.match(/^전체\s*([\d,]+)명$/);
    if (match) {
      if (targetLocale === 'vi-VN') return `Tổng ${match[1]} người`;
      if (targetLocale === 'zh-TW') return `共 ${match[1]} 位`;
      return `${match[1]} creators`;
    }
    match = lookupSource.match(/^([\d,]+)개 선택$/);
    if (match) {
      if (targetLocale === 'vi-VN') return `Đã chọn ${match[1]}`;
      if (targetLocale === 'zh-TW') return `已選 ${match[1]} 件`;
      return `${match[1]} selected`;
    }
    match = lookupSource.match(/^총\s*([\d,]+)개 브랜드$/);
    if (match) {
      if (targetLocale === 'vi-VN') return `Tổng ${match[1]} thương hiệu`;
      if (targetLocale === 'zh-TW') return `共 ${match[1]} 個品牌`;
      return `${match[1]} brands`;
    }
    return source;
  }

  function shouldSkip(node) {
    const parent = node.parentElement;
    return !parent || parent.closest('[data-kmodu-locale-ui], script, style, noscript, code, pre, textarea');
  }

  function translateTextNode(node) {
    if (shouldSkip(node)) return;
    if (!originalText.has(node)) originalText.set(node, node.nodeValue || '');
    const sourceRaw = originalText.get(node) || '';
    const source = sourceRaw.trim();
    if (!source) return;
    const value = translated(source, locale);
    if (value === source) {
      node.nodeValue = sourceRaw;
      return;
    }
    const leading = sourceRaw.match(/^\s*/)?.[0] || '';
    const trailing = sourceRaw.match(/\s*$/)?.[0] || '';
    node.nodeValue = `${leading}${value}${trailing}`;
  }

  function translateAttributes(el) {
    if (!(el instanceof Element) || el.closest('[data-kmodu-locale-ui]')) return;
    const attrs = ['placeholder', 'aria-label', 'title'];
    if (!originalAttrs.has(el)) originalAttrs.set(el, {});
    const stored = originalAttrs.get(el);
    attrs.forEach((name) => {
      if (!el.hasAttribute(name)) return;
      if (!(name in stored)) stored[name] = el.getAttribute(name);
      const source = stored[name] || '';
      el.setAttribute(name, translated(source, locale));
    });
  }

  function translateTree(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      translateTextNode(root);
      return;
    }
    if (!(root instanceof Element) && root !== document) return;
    if (root instanceof Element) translateAttributes(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let current;
    while ((current = walker.nextNode())) {
      if (current.nodeType === Node.TEXT_NODE) translateTextNode(current);
      else translateAttributes(current);
    }
  }

  function localeMenuMarkup() {
    const current = LOCALES[locale];
    return `
      <button class="locale-btn" type="button" aria-haspopup="menu" aria-expanded="false">
        <img src="/assets/flags/${current.flag}.svg" alt="" width="512" height="512" />
        <b>${current.short}</b><i class="caret" aria-hidden="true">▾</i>
      </button>
      <div class="locale-menu" role="menu">
        ${ORDER.map((code) => {
          const item = LOCALES[code];
          const active = code === locale;
          return `<button class="locale-opt${active ? ' is-on' : ''}" type="button" role="menuitemradio" aria-checked="${active}" data-locale="${code}">
            <img src="/assets/flags/${item.flag}.svg" alt="" width="512" height="512" />
            <span><strong>${item.language}</strong><small>${item.country}</small></span>
            ${active ? `<em>${current.current}</em>` : ''}
          </button>`;
        }).join('')}
      </div>`;
  }

  function bindDesktopSwitch(container) {
    container.setAttribute('data-kmodu-locale-ui', '');
    container.classList.add('kmodu-locale-switch');
    container.innerHTML = localeMenuMarkup();
    const button = container.querySelector('.locale-btn');
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const open = container.classList.toggle('open');
      button.setAttribute('aria-expanded', String(open));
    });
    container.querySelectorAll('[data-locale]').forEach((option) => {
      option.addEventListener('click', () => setLocale(option.dataset.locale));
    });
  }

  function ensureDesktopSwitch() {
    let container = document.querySelector('.locale-switch');
    if (container) {
      const replacement = container.cloneNode(false);
      replacement.id = container.id || 'localeSwitch';
      replacement.className = container.className;
      container.replaceWith(replacement);
      container = replacement;
      bindDesktopSwitch(container);
      return;
    }

    const host = document.querySelector('.top-actions, .nav-right, .nav-links');
    if (host) {
      container = document.createElement('div');
      container.className = 'locale-switch platform-locale-switch';
      container.id = 'localeSwitch';
      const auth = host.querySelector('[data-auth-link], .login-btn, .pill');
      host.insertBefore(container, auth || host.firstChild);
      bindDesktopSwitch(container);
      return;
    }

    container = document.createElement('div');
    container.className = 'locale-switch platform-locale-switch site-locale-floating';
    container.id = 'localeSwitch';
    document.body.appendChild(container);
    bindDesktopSwitch(container);
  }

  function ensureMobileSwitch() {
    document.querySelectorAll('.platform-menu-locale').forEach((legacyRow) => legacyRow.remove());
    const host = document.querySelector('.mobile-menu .mobile-utility, .platform-menu-panel');
    if (!host) return;
    let panel = host.matches('.mobile-utility') ? host : host.querySelector('.kmodu-mobile-locales');
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'kmodu-mobile-locales';
      host.appendChild(panel);
    }
    panel.classList.add('kmodu-mobile-locales');
    panel.setAttribute('data-kmodu-locale-ui', '');
    panel.innerHTML = ORDER.map((code) => {
      const item = LOCALES[code];
      return `<button type="button" class="${code === locale ? 'is-on' : ''}" data-locale="${code}" aria-label="${item.language}">
        <img src="/assets/flags/${item.flag}.svg" alt="" width="512" height="512" /><span>${item.short}</span>
      </button>`;
    }).join('');
    panel.querySelectorAll('[data-locale]').forEach((button) => {
      button.addEventListener('click', () => setLocale(button.dataset.locale));
    });
  }

  function injectStyles() {
    if (document.getElementById('kmoduLocaleStyles')) return;
    const style = document.createElement('style');
    style.id = 'kmoduLocaleStyles';
    style.textContent = `
      .kmodu-locale-switch{position:relative;z-index:90}.kmodu-locale-switch .locale-btn{display:inline-flex;align-items:center;gap:7px;min-height:36px;padding:5px 10px 5px 6px;border:1px solid rgba(17,17,17,.14);border-radius:999px;background:#fff;color:#111;cursor:pointer;font:inherit}.kmodu-locale-switch .locale-btn img{width:24px;height:24px;border-radius:50%;object-fit:cover}.kmodu-locale-switch .locale-btn b{font-size:11px;letter-spacing:.05em}.kmodu-locale-switch .locale-btn i{font-size:9px;font-style:normal;transition:transform .2s}.kmodu-locale-switch.open .locale-btn i{transform:rotate(180deg)}
      .kmodu-locale-switch .locale-menu{position:absolute;top:calc(100% + 8px);right:0;display:none;width:238px;padding:7px;border:1px solid rgba(17,17,17,.13);border-radius:14px;background:rgba(255,255,255,.98);box-shadow:0 18px 50px rgba(0,0,0,.16);backdrop-filter:blur(14px)}.kmodu-locale-switch.open .locale-menu{display:block}.kmodu-locale-switch .locale-opt{display:grid;grid-template-columns:30px 1fr auto;align-items:center;gap:10px;width:100%;padding:9px;border:0;border-radius:10px;background:transparent;color:#111;text-align:left;cursor:pointer}.kmodu-locale-switch .locale-opt:hover,.kmodu-locale-switch .locale-opt.is-on{background:#f2efe8}.kmodu-locale-switch .locale-opt img{width:28px;height:28px;border-radius:50%;object-fit:cover}.kmodu-locale-switch .locale-opt span{display:grid;gap:1px}.kmodu-locale-switch .locale-opt strong{font-size:13px}.kmodu-locale-switch .locale-opt small{font-size:10px;color:#777}.kmodu-locale-switch .locale-opt em{font-size:9px;color:#176640;font-style:normal;font-weight:700}
      .kmodu-mobile-locales{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;width:100%;padding:12px 0!important;border-top:1px solid rgba(17,17,17,.12)}.kmodu-mobile-locales button{display:flex;align-items:center;justify-content:center;gap:6px;min-height:42px;border:1px solid rgba(17,17,17,.12);border-radius:10px;background:#fff;color:#111;font:700 11px/1 Arial,sans-serif}.kmodu-mobile-locales button.is-on{border-color:#111;background:#111;color:#fff}.kmodu-mobile-locales img{width:22px!important;height:22px!important;border-radius:50%!important;opacity:1!important}.site-locale-floating{position:fixed;top:18px;right:18px;z-index:999}
      @media(max-width:760px){.topbar .kmodu-locale-switch,.top-nav .kmodu-locale-switch{display:none}.site-locale-floating{top:12px;right:12px}.kmodu-locale-switch .locale-menu{position:fixed;top:58px;right:12px;left:12px;width:auto}}
    `;
    document.head.appendChild(style);
  }

  function updateSelectors() {
    ensureDesktopSwitch();
    ensureMobileSwitch();
  }

  function setLocale(nextLocale) {
    if (!LOCALES[nextLocale]) return;
    locale = nextLocale;
    try { localStorage.setItem(STORAGE_KEY, locale); } catch (_) {}
    applyLocale();
  }

  function applyLocale() {
    if (applying) return;
    applying = true;
    if (observer) observer.disconnect();
    document.documentElement.lang = locale;
    translateTree(document.body);
    updateSelectors();
    document.querySelectorAll('.locale-switch.open').forEach((el) => el.classList.remove('open'));
    document.dispatchEvent(new CustomEvent('kmodu:localechange', { detail: { locale } }));
    applying = false;
    if (observer) observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'aria-label', 'title'] });
  }

  function startObserver() {
    observer = new MutationObserver((mutations) => {
      if (applying) return;
      applying = true;
      observer.disconnect();
      mutations.forEach((mutation) => {
        if (mutation.type === 'characterData') translateTextNode(mutation.target);
        else if (mutation.type === 'attributes') translateAttributes(mutation.target);
        else mutation.addedNodes.forEach(translateTree);
      });
      applying = false;
      observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'aria-label', 'title'] });
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'aria-label', 'title'] });
  }

  function boot() {
    injectStyles();
    applyLocale();
    startObserver();
    document.addEventListener('click', (event) => {
      document.querySelectorAll('.locale-switch.open').forEach((switcher) => {
        if (!switcher.contains(event.target)) switcher.classList.remove('open');
      });
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') document.querySelectorAll('.locale-switch.open').forEach((el) => el.classList.remove('open'));
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
