import { invokeLLM, type InvokeParams } from "./_core/llm";
import { createMultipleAnalyses, updatePaper, updateAnalysis, getAnalysesByPaperId } from "./db";
import { ENV } from "./_core/env";

/**
 * Invoke LLM with optional user-provided OpenAI API key.
 * If userApiKey is provided, calls OpenAI directly; otherwise uses the built-in platform model.
 */
async function invokeLLMWithKey(params: InvokeParams, userApiKey?: string) {
  if (userApiKey) {
    // Call OpenAI directly with user's key
    const payload: Record<string, unknown> = {
      model: params.model || "gpt-4o",
      messages: params.messages,
    };
    if (params.max_tokens) payload.max_tokens = params.max_tokens;
    if (params.response_format) payload.response_format = params.response_format;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${userApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} – ${errorText}`);
    }

    return await response.json();
  }

  // Use built-in platform LLM
  return invokeLLM(params);
}

/**
 * Step 1: Identify research directions from the paper text.
 * Returns a structured list of directions with brief descriptions.
 */
export async function identifyDirections(paperText: string, userApiKey?: string): Promise<{
  title: string;
  abstract: string;
  keywords: string[];
  directions: Array<{
    name: string;
    nameCn: string;
    briefDescription: string;
  }>;
}> {
  const truncatedText = paperText.length > 12000 ? paperText.slice(0, 12000) + "\n...[truncated]" : paperText;

  const response = await invokeLLMWithKey({
    model: userApiKey ? "gpt-4o" : "gpt-5-mini",
    messages: [
      {
        role: "system",
        content: `You are an expert computational chemistry researcher. Analyze the given paper text and identify:
1. The paper's title
2. The paper's abstract (or a concise summary if no explicit abstract)
3. Key keywords
4. All computational chemistry research directions/methods involved in this paper

For directions, identify specific computational chemistry methods, theories, or approaches used. Examples include but are not limited to:
- Density Functional Theory (DFT)
- Molecular Dynamics (MD)
- Quantum Chemistry / Ab Initio Methods
- Monte Carlo Methods
- Machine Learning Potentials
- Force Field Development
- Semiempirical Methods
- Coupled Cluster Theory
- Multiscale Modeling
- Reaction Path Analysis
- Electronic Structure Methods
- Molecular Orbital Theory
- Basis Set Methods
- Solvation Models

Output valid JSON only.`,
      },
      {
        role: "user",
        content: `Analyze this computational chemistry paper:\n\n${truncatedText}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "paper_directions",
        strict: true,
        schema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Paper title" },
            abstract: { type: "string", description: "Paper abstract or summary" },
            keywords: {
              type: "array",
              items: { type: "string" },
              description: "Key terms and keywords",
            },
            directions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Direction name in English" },
                  nameCn: { type: "string", description: "Direction name in Chinese" },
                  briefDescription: { type: "string", description: "Brief description of how this direction is used in the paper" },
                },
                required: ["name", "nameCn", "briefDescription"],
                additionalProperties: false,
              },
              description: "List of computational chemistry directions identified",
            },
          },
          required: ["title", "abstract", "keywords", "directions"],
          additionalProperties: false,
        },
      },
    },
  }, userApiKey);

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("Failed to get direction identification response");
  }

  return JSON.parse(content);
}

/**
 * Step 2: Generate deep analysis for a specific direction.
 * Uses reasoning/thinking for higher quality output.
 */
export async function analyzeDirection(
  paperText: string,
  direction: string,
  directionCn: string,
  briefDescription: string,
  userApiKey?: string
): Promise<string> {
  const truncatedText = paperText.length > 15000 ? paperText.slice(0, 15000) + "\n...[truncated]" : paperText;

  const params: InvokeParams = {
    model: userApiKey ? "gpt-4o" : "claude-sonnet-4-6",
    messages: [
      {
        role: "system",
        content: `你是一位计算化学领域的资深研究员和教育者。请针对给定论文中涉及的特定研究方向，生成一份结构化的深度解析报告。

报告要求：
1. **核心概念与背景知识**：解释该方向的基本原理和理论基础，让读者能够理解其科学意义
2. **论文中的具体应用**：详细分析论文如何运用该方向的方法，包括具体的计算设置、参数选择等
3. **关键公式与算法**：列出并解释论文中涉及的重要公式（使用LaTeX格式，如 $E = \\sum_i \\epsilon_i$ 或 $$H\\psi = E\\psi$$），给出通俗易懂的物理含义解释
4. **方法论细节**：讨论计算方法的优势、局限性、适用范围
5. **前沿进展与论文贡献**：将论文工作置于该方向的最新研究进展中，分析其创新点和贡献
6. **与其他方向的关联**：说明该方向如何与论文中其他计算方法协同工作

请使用Markdown格式输出，支持LaTeX数学公式（行内用 $...$，行间用 $$...$$）。
内容应当深入专业但表述清晰，适合具有一定化学背景的研究生或研究人员阅读。
输出语言为中文。`,
      },
      {
        role: "user",
        content: `论文内容：\n\n${truncatedText}\n\n---\n\n请针对以下研究方向进行深度解析：\n方向：${direction}（${directionCn}）\n简述：${briefDescription}`,
      },
    ],
    max_tokens: 8000,
  };

  // Only add thinking for built-in model (Claude supports it)
  if (!userApiKey) {
    params.thinking = { type: "enabled", budget_tokens: 4096 };
  }

  const response = await invokeLLMWithKey(params, userApiKey);

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error(`Failed to generate analysis for direction: ${direction}`);
  }

  return content;
}

/**
 * Full analysis pipeline: identify directions, then analyze each one.
 * Updates database progressively as each direction completes.
 */
export async function runFullAnalysis(paperId: number, paperText: string, userApiKey?: string): Promise<void> {
  try {
    // Step 1: Identify directions
    await updatePaper(paperId, { status: "analyzing" });

    const identification = await identifyDirections(paperText, userApiKey);

    // Update paper with identified metadata
    await updatePaper(paperId, {
      title: identification.title,
      abstract: identification.abstract,
      keywords: JSON.stringify(identification.keywords),
      directions: JSON.stringify(identification.directions.map(d => d.name)),
    });

    if (identification.directions.length === 0) {
      await updatePaper(paperId, { status: "completed" });
      return;
    }

    // Create analysis records for each direction
    const analysisRecords = identification.directions.map((dir, index) => ({
      paperId,
      direction: dir.name,
      directionCn: dir.nameCn,
      summary: dir.briefDescription,
      status: "pending" as const,
      orderIndex: index,
    }));

    await createMultipleAnalyses(analysisRecords);

    // Step 2: Analyze each direction sequentially, update progressively
    const createdAnalyses = await getAnalysesByPaperId(paperId);

    for (const analysis of createdAnalyses) {
      try {
        await updateAnalysis(analysis.id, { status: "analyzing" });

        const dirInfo = identification.directions.find(d => d.name === analysis.direction);
        const content = await analyzeDirection(
          paperText,
          analysis.direction,
          analysis.directionCn || "",
          dirInfo?.briefDescription || "",
          userApiKey
        );

        await updateAnalysis(analysis.id, {
          content,
          status: "completed",
        });
      } catch (error) {
        console.error(`[Analysis] Failed for direction ${analysis.direction}:`, error);
        await updateAnalysis(analysis.id, {
          status: "failed",
          content: `分析失败: ${error instanceof Error ? error.message : "未知错误"}`,
        });
      }
    }

    // Mark paper as completed
    await updatePaper(paperId, { status: "completed" });
  } catch (error) {
    console.error(`[Analysis] Full analysis failed for paper ${paperId}:`, error);
    await updatePaper(paperId, {
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Analysis failed",
    });
  }
}
