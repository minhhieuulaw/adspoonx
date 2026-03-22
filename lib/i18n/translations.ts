export const translations = {
  en: {
    // Sidebar
    sidebar: {
      adsLibrary: "Ads Library",
      trending: "Trending",
      saved: "Saved",
      settings: "Settings",
      upgradeBanner: {
        title: "Upgrade to Premium",
        description: "Unlimited ads, advanced filters",
        cta: "Upgrade Now",
      },
    },
    // Header
    header: {
      searchPlaceholder: "Search ads, products, brands...",
    },
    // Login
    login: {
      tagline: "Facebook Ads Intelligence",
      title: "Sign in to your account",
      subtitle: "Discover thousands of running ads",
      continueWithGoogle: "Continue with Google",
      termsPrefix: "By signing in, you agree to our",
      termsLink: "Terms of Service",
    },
    // Ads page
    ads: {
      pageTitle: "Ads Library",
      pageSubtitle: "Discover ads currently running on Facebook",
      loadMore: "Load More",
      noResults: "No ads found",
      noResultsHint: "Try changing your keywords or filters",
      results: "results",
      loading: "Loading...",
    },
    // Filters
    filter: {
      label: "Filters:",
      active: "Active",
      inactive: "Inactive",
      all: "All",
      countries: {
        VN: "Vietnam",
        US: "United States",
        TH: "Thailand",
        ID: "Indonesia",
        PH: "Philippines",
        MY: "Malaysia",
      },
    },
    // Ad card
    adCard: {
      saveAd: "Save ad",
      viewOriginal: "View original",
      impressions: "impressions",
    },
    // Trending page
    trending: {
      pageTitle: "Trending Ads",
      pageSubtitle: "Highest impression ads in Vietnam",
      statsPrefix: "Found",
      statsMid: "trending ads from",
      statsSuffix: "hot keywords",
    },
    // Saved page
    saved: {
      pageTitle: "Saved Ads",
      comingSoon: "Feature coming soon. Click the bookmark icon on any ad to save it.",
    },
    // Settings page
    settings: {
      pageTitle: "Settings",
      comingSoon: "Feature coming soon.",
    },
    // User dropdown
    userMenu: {
      signOut: "Sign out",
    },
    // Pricing banner
    pricing: {
      upgradeTitle: "Upgrade to Premium",
    },
  },

  vi: {
    // Sidebar
    sidebar: {
      adsLibrary: "Kho Ads",
      trending: "Trending",
      saved: "Đã lưu",
      settings: "Cài đặt",
      upgradeBanner: {
        title: "Nâng cấp Premium",
        description: "Không giới hạn ads, filter nâng cao",
        cta: "Nâng cấp ngay",
      },
    },
    // Header
    header: {
      searchPlaceholder: "Tìm kiếm từ khóa, sản phẩm, thương hiệu...",
    },
    // Login
    login: {
      tagline: "Facebook Ads Intelligence",
      title: "Đăng nhập vào tài khoản",
      subtitle: "Khám phá hàng nghìn quảng cáo đang chạy",
      continueWithGoogle: "Tiếp tục với Google",
      termsPrefix: "Bằng cách đăng nhập, bạn đồng ý với",
      termsLink: "Điều khoản dịch vụ",
    },
    // Ads page
    ads: {
      pageTitle: "Kho Quảng Cáo",
      pageSubtitle: "Khám phá các quảng cáo đang chạy trên Facebook",
      loadMore: "Tải thêm",
      noResults: "Không tìm thấy quảng cáo nào",
      noResultsHint: "Thử thay đổi từ khóa hoặc bộ lọc",
      results: "kết quả",
      loading: "Đang tải...",
    },
    // Filters
    filter: {
      label: "Bộ lọc:",
      active: "Đang chạy",
      inactive: "Đã dừng",
      all: "Tất cả",
      countries: {
        VN: "Việt Nam",
        US: "Hoa Kỳ",
        TH: "Thái Lan",
        ID: "Indonesia",
        PH: "Philippines",
        MY: "Malaysia",
      },
    },
    // Ad card
    adCard: {
      saveAd: "Lưu ad",
      viewOriginal: "Xem bản gốc",
      impressions: "lượt",
    },
    // Trending page
    trending: {
      pageTitle: "Trending Ads",
      pageSubtitle: "Quảng cáo có lượt hiển thị cao nhất tại Việt Nam",
      statsPrefix: "Tìm thấy",
      statsMid: "ads trending từ",
      statsSuffix: "từ khóa hot",
    },
    // Saved page
    saved: {
      pageTitle: "Ads đã lưu",
      comingSoon: "Tính năng đang phát triển. Nhấn icon bookmark trên mỗi ad để lưu lại.",
    },
    // Settings page
    settings: {
      pageTitle: "Cài đặt",
      comingSoon: "Tính năng đang phát triển.",
    },
    // User dropdown
    userMenu: {
      signOut: "Đăng xuất",
    },
    // Pricing banner
    pricing: {
      upgradeTitle: "Nâng cấp Premium",
    },
  },
} as const;

export type Locale = keyof typeof translations;
export type Translations = typeof translations[Locale];
