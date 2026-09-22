using ClosedXML.Excel;

namespace AssetManager.Api.Infrastructure.Excel;

public sealed record ExcelColumn<T>(string Header, Func<T, object?> Value);

public static class ExcelExporter
{
    public const string ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    public static byte[] Export<T>(string sheetName, IReadOnlyList<ExcelColumn<T>> columns, IEnumerable<T> rows)
    {
        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add(sheetName);

        for (var c = 0; c < columns.Count; c++)
            sheet.Cell(1, c + 1).Value = columns[c].Header;
        var header = sheet.Range(1, 1, 1, columns.Count);
        header.Style.Font.Bold = true;
        header.Style.Fill.BackgroundColor = XLColor.FromHtml("#FAFAFA");

        var r = 2;
        foreach (var row in rows)
        {
            for (var c = 0; c < columns.Count; c++)
                SetCell(sheet.Cell(r, c + 1), columns[c].Value(row));
            r++;
        }

        sheet.SheetView.FreezeRows(1);
        sheet.Columns().AdjustToContents();
        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    private static void SetCell(IXLCell cell, object? value)
    {
        switch (value)
        {
            case null:
                break;
            case DateTime dateTime:
                cell.Value = dateTime;
                cell.Style.DateFormat.Format = "yyyy-mm-dd hh:mm";
                break;
            case DateOnly date:
                cell.Value = date.ToDateTime(TimeOnly.MinValue);
                cell.Style.DateFormat.Format = "yyyy-mm-dd";
                break;
            case decimal number:
                cell.Value = (double)number;
                cell.Style.NumberFormat.Format = "#,##0.00";
                break;
            case int number:
                cell.Value = number;
                break;
            default:
                cell.Value = value.ToString();
                break;
        }
    }
}
