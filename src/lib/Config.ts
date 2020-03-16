export const Config = {
    token: process.env.DISCORD_TOKEN || "Njg3NjYzNjM3NzExOTQ1NzY2.XmpCtA.KwgEYAxuUQrYtav7FDdVcvz2OG8",
    db: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    }
}