import { fetchOpenMeteoWeather, WeatherError } from "@/lib/weather";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const location = (searchParams.get("location") ?? "New York").trim();
  const days = Number(searchParams.get("days") ?? "7");
  if (
    !location ||
    location.length > 200 ||
    !Number.isInteger(days) ||
    days < 1 ||
    days > 16
  ) {
    return Response.json(
      {
        success: false,
        error: "Enter a location and between 1 and 16 forecast days",
      },
      { status: 400 },
    );
  }
  try {
    return Response.json({
      success: true,
      data: await fetchOpenMeteoWeather(location, days),
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error:
          error instanceof WeatherError
            ? error.message
            : "Unable to fetch weather. Please try again.",
      },
      { status: error instanceof WeatherError ? error.status : 502 },
    );
  }
}
