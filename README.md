# Prev25 Language Support

A Visual Studio Code extension that provides syntax highlighting and language support for Prev25 programming language files.

## Features

- **Syntax Highlighting**: Full syntax highlighting for `.prev25` files
- **Language Configuration**: Proper indentation, bracket matching, and commenting support
- **File Recognition**: Automatic detection of `.prev25` files
- **Compiler Integration**: Configurable paths for Prev25 compiler and ANTLR

## Installation

1. Install the extension from the VS Code marketplace
2. Open any `.prev25` file to activate the extension

## Configuration

The extension provides the following configuration options:

### `prev25.binDirectory`
- **Type**: `string`
- **Default**: `/home/tim/p/prev25/bin`
- **Description**: Path to the Prev25 compiler binary directory

### `prev25.antlrJarPath`
- **Type**: `string`
- **Default**: `/home/tim/p/prev25/lib/antlr-4.13.2-complete.jar`
- **Description**: Path to the ANTLR JAR file

To configure these settings, go to **File > Preferences > Settings** and search for "Prev25".

## Supported Features

- Syntax highlighting for Prev25 language constructs
- Keywords, operators, and built-in functions highlighting
- String and comment highlighting
- Variable and function name highlighting
- Number literal highlighting
- Proper indentation and formatting

## File Association

The extension automatically activates for files with the `.prev25` extension.

## License

See the [LICENSE](LICENSE) file for details.

---

**Enjoy coding in Prev25!** 🚀