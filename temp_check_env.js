console.log("OPENAI_API_KEY exists?", !!process.env.OPENAI_API_KEY);
if (process.env.OPENAI_API_KEY) {
    console.log("Length:", process.env.OPENAI_API_KEY.length);
}
