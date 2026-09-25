import { beforeEach, describe, expect, it } from "vitest";
import { cleanText, findPosts, profileId } from "@/lib/linkedin/extract";
import { isFeedPath } from "@/lib/linkedin/selectors";
import fixture from "./fixtures/feed.html?raw";

describe("findPosts", () => {
  beforeEach(() => {
    document.body.innerHTML = fixture;
  });

  const byId = () => Object.fromEntries(findPosts().map((p) => [p.root.id, p]));

  it("finds every post with text, and flags the ones too short to score", () => {
    expect(Object.keys(byId()).sort()).toEqual(
      ["legacy", "motivational", "plain-repost", "repost", "short"].sort(),
    );
    expect(byId().short?.short).toBe(true);
    expect(byId().motivational?.short).toBe(false);
  });

  it("reads the full text, not the clamped preview or the comments", () => {
    const post = byId().motivational?.post;
    expect(post?.text).toContain("I got rejected from 47 jobs.");
    expect(post?.text).toContain("#grind");
    expect(post?.text).not.toContain("hashtag#");
    expect(post?.text).not.toContain("This comment");
    expect(post?.reshared).toBeUndefined();
  });

  it("splits a repost into the author's comment and the reshared post", () => {
    const post = byId().repost?.post;
    expect(post?.text).toBe("So true. This is what real leadership looks like 👇");
    expect(post?.reshared).toContain("replacing webpack with Vite");
  });

  it("puts the badge outside links, so clicking it doesn't navigate", () => {
    const { anchor } = byId()["plain-repost"] ?? {};
    expect(anchor?.tagName).toBe("A");
    expect(byId().motivational?.anchor.tagName).toBe("P");
  });

  it("supports the pre-2026 markup and ignores legacy comments", () => {
    const legacy = byId().legacy;
    expect(legacy?.post.text).toBe(
      "Legacy markup post with enough words to be analysed by the extension.",
    );
    expect(legacy?.anchor.className).toBe("feed-shared-update-v2__description-wrapper");
  });
});

describe("cleanText", () => {
  it("drops the trailing '… more' and collapses blank runs", () => {
    expect(cleanText("Hello\n\n\n\nworld   \n… more")).toBe("Hello\n\nworld");
    expect(cleanText("hashtag#ai rules")).toBe("#ai rules");
  });
});

describe("post author", () => {
  beforeEach(() => {
    document.body.innerHTML = fixture;
  });

  const byId = () => Object.fromEntries(findPosts().map((p) => [p.root.id, p]));

  it("picks the author, not the person who liked the post", () => {
    expect(byId().motivational?.post.author).toBe("in:jane-placeholder-123");
  });

  it("falls back to the last profile above the text", () => {
    expect(byId().repost?.post.author).toBe("company:acme-corp");
  });

  it("never reads profiles below the text, such as commenters", () => {
    expect(byId()["plain-repost"]?.post.author).toBeUndefined();
  });
});

describe("profileId", () => {
  it("normalises profile URLs", () => {
    expect(profileId("https://www.linkedin.com/in/Jane-Doe-1/?x=y")).toBe("in:jane-doe-1");
    expect(profileId("/company/acme/posts")).toBe("company:acme");
    expect(profileId("/feed/update/1")).toBeUndefined();
  });
});

describe("hidden posts", () => {
  it("skips posts the page itself hides, like promoted posts behind display: none", () => {
    document.body.innerHTML = fixture;
    const before = findPosts().length;
    const first = findPosts()[0];
    const wrapper = first?.root.querySelector("[data-testid=expandable-text-box]")
      ?.parentElement as HTMLElement;
    wrapper.style.display = "none";
    expect(findPosts()).toHaveLength(before - 1);
    expect(findPosts().some((p) => p.root === first?.root)).toBe(false);
  });
});

describe("isFeedPath", () => {
  it("folds in the feed only, not on profiles or single posts", () => {
    expect(isFeedPath("/feed/")).toBe(true);
    expect(isFeedPath("/feed")).toBe(true);
    expect(isFeedPath("/feed/update/urn:li:activity:123/")).toBe(false);
    expect(isFeedPath("/in/jane-doe/recent-activity/all/")).toBe(false);
    expect(isFeedPath("/in/jane-doe/")).toBe(false);
  });
});
