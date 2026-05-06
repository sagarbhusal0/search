# Implementation Plan: Fix Search Pagination

## Overview

This implementation plan fixes the broken pagination functionality across all search pages (web, images, news, videos) in the frontend application. The fix ensures that the "Next Page" button properly uses the next page token (npt) from API responses, disables when no more results are available, and scrolls to the top when navigating to a new page.

## Tasks

- [ ] 1. Fix pagination in web search (SearchResults.tsx)
  - [x] 1.1 Create handleNextPage function with scroll behavior
    - Implement function that checks for valid npt
    - Add router.push with updated URL parameters
    - Add window.scrollTo call for smooth scroll to top
    - Remove legacy 'p' parameter when using npt
    - _Requirements: 1.1, 1.2, 1.5, 4.3_
  
  - [x] 1.2 Update Next Page button with disabled state
    - Add disabled prop based on npt validity (!npt)
    - Add disabled styling classes (opacity-50, cursor-not-allowed)
    - Update onClick to use handleNextPage function
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [ ]* 1.3 Write property test for navigation with valid npt
    - **Property 1: Navigation with valid npt triggers URL update and preserves parameters**
    - **Validates: Requirements 1.1, 1.2, 3.3, 4.1, 4.4**
  
  - [ ]* 1.4 Write property test for URL npt parameter usage
    - **Property 2: URL with npt parameter triggers API fetch with that token**
    - **Validates: Requirements 1.3, 4.2**
  
  - [ ]* 1.5 Write property test for npt state storage
    - **Property 3: API response npt is stored in component state**
    - **Validates: Requirements 1.4**
  
  - [ ]* 1.6 Write unit tests for button state and edge cases
    - Test button disabled when npt is null/undefined
    - Test button enabled when npt has valid value
    - Test disabled button prevents navigation
    - Test scroll behavior on navigation
    - _Requirements: 2.1, 2.2, 2.4, 1.5_

- [ ] 2. Fix pagination in images search (images/page.tsx)
  - [x] 2.1 Create handleNextPage function with scroll behavior
    - Implement function that checks for valid npt
    - Add router.push with updated URL parameters
    - Add window.scrollTo call for smooth scroll to top
    - Remove legacy 'p' parameter when using npt
    - _Requirements: 1.1, 1.2, 1.5, 4.3_
  
  - [x] 2.2 Update Next Page button with disabled state
    - Add disabled prop based on npt validity (!npt)
    - Add disabled styling classes (opacity-50, cursor-not-allowed)
    - Update onClick to use handleNextPage function
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [ ]* 2.3 Write property tests for images pagination
    - **Property 1: Navigation with valid npt triggers URL update and preserves parameters**
    - **Property 2: URL with npt parameter triggers API fetch with that token**
    - **Property 3: API response npt is stored in component state**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 3.3, 4.1, 4.2, 4.4**
  
  - [ ]* 2.4 Write unit tests for images button state
    - Test button disabled when npt is null/undefined
    - Test button enabled when npt has valid value
    - Test scroll behavior on navigation
    - _Requirements: 2.1, 2.2, 1.5_

- [ ] 3. Fix pagination in news search (news/page.tsx)
  - [x] 3.1 Create handleNextPage function with scroll behavior
    - Implement function that checks for valid npt
    - Add router.push with updated URL parameters
    - Add window.scrollTo call for smooth scroll to top
    - Remove legacy 'p' parameter when using npt
    - _Requirements: 1.1, 1.2, 1.5, 4.3_
  
  - [x] 3.2 Update Next Page button with disabled state
    - Add disabled prop based on npt validity (!npt)
    - Add disabled styling classes (opacity-50, cursor-not-allowed)
    - Update onClick to use handleNextPage function
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [ ]* 3.3 Write property tests for news pagination
    - **Property 1: Navigation with valid npt triggers URL update and preserves parameters**
    - **Property 2: URL with npt parameter triggers API fetch with that token**
    - **Property 3: API response npt is stored in component state**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 3.3, 4.1, 4.2, 4.4**

- [ ] 4. Fix pagination in videos search (videos/page.tsx)
  - [x] 4.1 Create handleNextPage function with scroll behavior
    - Implement function that checks for valid npt
    - Add router.push with updated URL parameters
    - Add window.scrollTo call for smooth scroll to top
    - Remove legacy 'p' parameter when using npt
    - _Requirements: 1.1, 1.2, 1.5, 4.3_
  
  - [x] 4.2 Update Next Page button with disabled state
    - Add disabled prop based on npt validity (!npt)
    - Add disabled styling classes (opacity-50, cursor-not-allowed)
    - Update onClick to use handleNextPage function
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [ ]* 4.3 Write property tests for videos pagination
    - **Property 1: Navigation with valid npt triggers URL update and preserves parameters**
    - **Property 2: URL with npt parameter triggers API fetch with that token**
    - **Property 3: API response npt is stored in component state**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 3.3, 4.1, 4.2, 4.4**

- [x] 5. Checkpoint - Verify pagination works across all search types
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 6. Write comprehensive property-based tests
  - [ ]* 6.1 Write property test for scroll behavior
    - **Property 4: Navigation triggers scroll to top**
    - **Validates: Requirements 1.5**
  
  - [ ]* 6.2 Write property test for button enabled state
    - **Property 5: Button enabled state matches npt validity**
    - **Validates: Requirements 2.1, 2.2**
  
  - [ ]* 6.3 Write property test for disabled button styling
    - **Property 6: Disabled button has disabled styling**
    - **Validates: Requirements 2.3**
  
  - [ ]* 6.4 Write property test for disabled button click prevention
    - **Property 7: Disabled button prevents navigation**
    - **Validates: Requirements 2.4**
  
  - [ ]* 6.5 Write property test for legacy parameter removal
    - **Property 8: Legacy page parameter removed during npt navigation**
    - **Validates: Requirements 4.3**

- [ ] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster implementation
- Each task references specific requirements for traceability
- The fix follows the same pattern across all four search pages for consistency
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples and edge cases
- All pagination buttons should maintain existing visual design while adding disabled state styling
