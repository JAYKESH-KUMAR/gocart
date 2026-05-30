import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { openai } from "@/configs/openai";


async function main(base64Image, mimeType) {
    const messages = [
        {
            "role": "system",
            "content": `
      You are a product  listing assistant for an ecommerce website store.
     your  job is to analyze the image  of a product and generate  structured data.


     Respond ONLY with raw JSON ( no code blocks, no markdown, no explanations)
        The JSON must  strictly follow this schema :

        {
          "name": "string",     
          "description": "string",  
          
          
          }
          



      
      
      
      `,
        },
        



        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Analyze this image and generate a product name+description .",
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": `data:${mimeType};base64,${base64Image}`
                    },
                },
            ],
        }
    ];
    
    
  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages,
    });

    const row = response.choices?.[0]?.message?.content;

      if (!row) {
      throw new Error("No response from AI");
    }

    // remove ``` json or ```  wrappers if they exist

    const cleaned = row.replace(/```json|```/g, "").trim();
    let parsed ;
    try {
        parsed = JSON.parse(cleaned);
        return parsed;
    } catch (error) {
        throw new Error("AI did not return valid JSON");
    }
}catch (error) {
    throw error;
}
    
    


}


export async function POST(request) {


    try {
        const { userId } = getAuth(request);
        const isSeller = await authSeller(userId);
        if (!isSeller) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
        }
        const { base64Image, mimeType } = await request.json();
        const result = await main(base64Image, mimeType);
        return NextResponse.json(result);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message}, { status: 400 });
    }

}

