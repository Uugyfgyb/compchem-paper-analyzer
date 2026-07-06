import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getPaperById, getPapersByUserId, getAnalysesByPaperId } from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  paper: router({
    // Get a single paper by ID
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const paper = await getPaperById(input.id);
        if (!paper) return null;
        // Only allow owner to view their papers
        if (paper.userId !== ctx.user.id) return null;

        // Parse JSON fields
        return {
          ...paper,
          keywords: paper.keywords ? JSON.parse(paper.keywords) : [],
          directions: paper.directions ? JSON.parse(paper.directions) : [],
          // Don't send full extracted text to client
          extractedText: undefined,
        };
      }),

    // List all papers for the current user
    list: protectedProcedure.query(async ({ ctx }) => {
      const papersList = await getPapersByUserId(ctx.user.id);
      return papersList.map(paper => ({
        ...paper,
        keywords: paper.keywords ? JSON.parse(paper.keywords) : [],
        directions: paper.directions ? JSON.parse(paper.directions) : [],
        extractedText: undefined,
      }));
    }),

    // Get analyses for a paper
    getAnalyses: protectedProcedure
      .input(z.object({ paperId: z.number() }))
      .query(async ({ input, ctx }) => {
        // Verify ownership
        const paper = await getPaperById(input.paperId);
        if (!paper || paper.userId !== ctx.user.id) return [];

        return await getAnalysesByPaperId(input.paperId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
