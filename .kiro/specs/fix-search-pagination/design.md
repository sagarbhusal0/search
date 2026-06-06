# Design Document: Fix Search Pagination

## Overview

This design addresses the broken pagination functionality in the search application's frontend. The core issue is that the "Next Page" button doesn't properly utilize the `npt` (next page token) parameter returned by the API, causing users to see the same results when attempting to navigate to subsequent pages.

The fix involves:
1. Properly managing the `npt` state from API responses
2. Correctly updating the URL with the `npt` parameter when navigating
3. Disabling the pagination button when no more results are available
4. Ensuring the page scrolls to the top on navigation
5. Applying the fix consistently across all four search pages (web, images, news, videos)

## Architecture

The search application follows a client-side routing architecture using Next.js with the App Router. Each search type (web, images, news, videos) is implemented as a separate page component that:

1. Reads search parameters from the URL using `useSearchParams()`
2. Fetches results from the API based on query, scraper, and pagination parameters
3. Manages local state for results, loading, and pagination tokens
4. Renders results and pagination controls
5. Uses `useRouter()` to navigate between pages

The pagination flow works as follows:

```
User clicks Next Page
  ↓
Component reads current npt from state
  ↓
Component constructs new URL with npt parameter
  ↓
Router navigates to new URL
  ↓
useEffect detects URL change
  ↓
Component fetches results with npt parameter
  ↓
API returns new results + new npt
  ↓
Component updates state with results and npt
```

## Components and Interfaces

### Affected Components

1. **frontend/src/app/search/SearchResults.tsx** - Web search results page
2. **frontend/src/app/images/page.tsx** - Image search results page
3. **frontend/src/app/news/page.tsx** - News search results page
4. **frontend/src/app/videos/page.tsx** - Video search results page

### State Management

Each component maintains the following relevant state:

```typescript
const [npt, setNpt] = useState<string | null>(null);  // Next page token from API
const [results, setResults] = useState<ResultType[]>([]);  // Search results
const [loading, setLoading] = useState(true);  // Loading state
```

### URL Parameters

- `s` - Search query string
- `scraper` - Selected search engine/scraper
- `p` - Page number (legacy, should be removed when npt is present)
- `npt` - Next page token for pagination

### API Response Structure

```typescript
interface ApiResponse {
  web?: WebResult[];      // For web search
  image?: ImageResult[];  // For image search
  news?: NewsResult[];    // For news search
  video?: VideoResult[];  // For video search
  npt?: string;          // Next page token (may be null/undefined)
  related?: string[];    // Related searches (web only)
}
```

### Pagination Button Component

The pagination button is rendered conditionally and should:
- Only appear when results are present and not loading
- Be disabled when `npt` is null or undefined
- Trigger navigation with the current `npt` value when clicked
- Scroll the page to top after navigation

## Data Models

### Pagination State

```typescript
interface PaginationState {
  npt: string | null;           // Current next page token
  hasNextPage: boolean;         // Derived: npt !== null && npt !== undefined
  isNavigating: boolean;        // True during navigation
}
```

### URL State

```typescript
interface SearchURLParams {
  s: string;                    // Search query (required)
  scraper?: string;             // Scraper selection (optional)
  npt?: string;                 // Next page token (optional)
  p?: string;                   // Page number (legacy, optional)
}
```

## Implementation Details

### 1. Fetching Results with Pagination

The current implementation correctly checks for `npt` in the URL and includes it in the API request:

```typescript
useEffect(() => {
  if (!query) return;
  
  const fetchResults = async () => {
    setLoading(true);
    try {
      let url = `/api/search?q=${encodeURIComponent(query)}&scraper=${scraper}`;
      const currentNpt = searchParams.get("npt");
      if (currentNpt) {
        url += `&npt=${encodeURIComponent(currentNpt)}`;
      } else {
        url += `&p=${page}`;
      }
      
      const res = await fetch(url);
      const data = await res.json();
      
      setResults(data.web || []);
      setNpt(data.npt || null);  // Store the npt for next navigation
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  
  fetchResults();
}, [query, scraper, page, searchParams]);
```

This pattern is correct and should be maintained.

### 2. Navigation Handler (NEEDS FIX)

The current navigation handler has issues:

**Current (Broken) Implementation:**
```typescript
onClick={() => {
  const params = new URLSearchParams(searchParams.toString());
  params.delete("p");
  if (npt) {
    params.set("npt", npt);
    router.push(`/search?${params.toString()}`);
  }
}
```

**Issues:**
1. Navigation only happens if `npt` is truthy - button should be disabled instead
2. No scroll to top after navigation
3. Button is always enabled even when `npt` is null

**Fixed Implementation:**
```typescript
const handleNextPage = () => {
  if (!npt) return;  // Safety check
  
  const params = new URLSearchParams(searchParams.toString());
  params.delete("p");  // Remove legacy page parameter
  params.set("npt", npt);  // Add next page token
  
  router.push(`/search?${params.toString()}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
```

### 3. Button Rendering (NEEDS FIX)

The button should be disabled when there's no next page:

**Current (Broken) Implementation:**
```typescript
<button
  onClick={handleNextPage}
  className="..."
>
  Next Page
</button>
```

**Fixed Implementation:**
```typescript
<button
  onClick={handleNextPage}
  disabled={!npt}
  className={`... ${!npt ? 'opacity-50 cursor-not-allowed' : ''}`}
>
  Next Page
</button>
```

### 4. Scroll to Top

After navigation, the page should scroll to the top. This can be achieved by:

**Option A: In the click handler (Recommended)**
```typescript
const handleNextPage = () => {
  if (!npt) return;
  
  const params = new URLSearchParams(searchParams.toString());
  params.delete("p");
  params.set("npt", npt);
  
  router.push(`/search?${params.toString()}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
```

**Option B: In a useEffect watching the URL**
```typescript
useEffect(() => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}, [searchParams]);
```

Option A is simpler and more direct, so it's recommended.

### 5. Consistent Implementation Across Pages

All four search pages (web, images, news, videos) follow the same pattern and need the same fixes:

1. Add `handleNextPage` function with scroll behavior
2. Add `disabled` prop to button based on `npt` state
3. Add disabled styling to button
4. Ensure `npt` state is properly updated from API response

## Error Handling

### Missing or Invalid npt

- If the API returns no `npt` (null or undefined), the button should be disabled
- If the API returns an invalid `npt` that causes an error, the error should be caught and displayed to the user
- The existing error handling in the fetch logic is sufficient

### Network Errors

- Existing try-catch blocks handle network errors appropriately
- Loading states prevent multiple simultaneous requests
- Error messages are displayed to users when fetches fail

### Edge Cases

1. **First page**: No `npt` in URL, uses `p` parameter or defaults to page 1
2. **Last page**: API returns `npt: null`, button is disabled
3. **Invalid npt**: API should return an error, caught by existing error handling
4. **Rapid clicking**: Button should be disabled during loading to prevent multiple requests
5. **Browser back/forward**: URL parameters are preserved, component refetches correctly


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Navigation with valid npt triggers URL update and preserves parameters

*For any* search page component with a valid (non-null, non-undefined) npt value in state, when the Next Page button is clicked, the router should navigate to a URL that includes the npt parameter and preserves all existing query parameters (search query 's' and scraper selection).

**Validates: Requirements 1.1, 1.2, 3.3, 4.1, 4.4**

### Property 2: URL with npt parameter triggers API fetch with that token

*For any* search page component that loads with an npt parameter in the URL, the component should make an API request that includes that npt parameter (and not include the legacy 'p' parameter).

**Validates: Requirements 1.3, 4.2**

### Property 3: API response npt is stored in component state

*For any* API response received by a search page component, if the response contains an npt field, that value should be stored in the component's npt state variable for use in subsequent navigation.

**Validates: Requirements 1.4**

### Property 4: Navigation triggers scroll to top

*For any* search page component, when the Next Page button is clicked with a valid npt, the window should scroll to the top of the page (scrollTo with top: 0 should be called).

**Validates: Requirements 1.5**

### Property 5: Button enabled state matches npt validity

*For any* search page component, the Next Page button's disabled state should be false when npt is a non-null, non-undefined string, and true when npt is null or undefined.

**Validates: Requirements 2.1, 2.2**

### Property 6: Disabled button has disabled styling

*For any* search page component where npt is null or undefined, the Next Page button should have CSS classes that indicate a disabled state (such as 'opacity-50' and 'cursor-not-allowed').

**Validates: Requirements 2.3**

### Property 7: Disabled button prevents navigation

*For any* search page component where npt is null or undefined, clicking the Next Page button should not trigger a router.push call.

**Validates: Requirements 2.4**

### Property 8: Legacy page parameter removed during npt navigation

*For any* search page component with both 'p' and 'npt' parameters in the URL, when navigating to the next page, the new URL should contain the npt parameter but not the 'p' parameter.

**Validates: Requirements 4.3**

## Testing Strategy

### Dual Testing Approach

This fix will be validated using both unit tests and property-based tests:

**Unit Tests** will cover:
- Specific examples of button clicks with valid/invalid npt
- Edge cases like null, undefined, and empty string npt values
- Integration between components and the router
- Scroll behavior on navigation
- URL parameter manipulation

**Property-Based Tests** will cover:
- Universal properties across all valid npt token strings
- Comprehensive input coverage through randomization
- Verification that properties hold for all search page types

### Property-Based Testing Configuration

We'll use **@fast-check/vitest** for property-based testing in this TypeScript/React application. Each property test will:
- Run a minimum of 100 iterations
- Generate random valid npt tokens (non-empty strings)
- Generate random search queries and scraper selections
- Test across all four search page components (web, images, news, videos)

Each property test will be tagged with a comment referencing its design property:
```typescript
// Feature: fix-search-pagination, Property 1: Navigation with valid npt triggers URL update and preserves parameters
```

### Unit Testing Focus

Unit tests should focus on:
1. **Specific examples**: Test with known npt values like "abc123", "token-with-dashes"
2. **Edge cases**: Test with null, undefined, empty string, very long strings
3. **Integration**: Test that clicking the button calls router.push with correct URL
4. **Scroll behavior**: Test that window.scrollTo is called with { top: 0, behavior: 'smooth' }
5. **Button state**: Test that disabled attribute is set correctly based on npt value
6. **CSS classes**: Test that disabled styling classes are applied when npt is null

### Testing Tools

- **Testing Library**: @testing-library/react for component testing
- **Property Testing**: @fast-check/vitest for property-based tests
- **Mocking**: Mock Next.js router and window.scrollTo
- **Assertions**: Vitest assertions for state and behavior verification

### Test Coverage Goals

- All 8 correctness properties implemented as property-based tests
- Edge cases covered by unit tests
- All four search page components tested
- Button state, URL updates, and scroll behavior verified
