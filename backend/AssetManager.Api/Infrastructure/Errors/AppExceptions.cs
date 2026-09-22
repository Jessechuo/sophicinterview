namespace AssetManager.Api.Infrastructure.Errors;

// Expected failures thrown by services; GlobalExceptionHandler turns them into ProblemDetails.
public abstract class AppException(string message, int statusCode, string title) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
    public string Title { get; } = title;
}

public sealed class BadRequestException(string message)
    : AppException(message, StatusCodes.Status400BadRequest, "Bad request");

public sealed class UnauthorizedException(string message)
    : AppException(message, StatusCodes.Status401Unauthorized, "Unauthorized");

public sealed class ForbiddenException(string message)
    : AppException(message, StatusCodes.Status403Forbidden, "Forbidden");

public sealed class NotFoundException(string message)
    : AppException(message, StatusCodes.Status404NotFound, "Not found");

public sealed class ConflictException(string message)
    : AppException(message, StatusCodes.Status409Conflict, "Conflict");
