library(shiny)
library(shinyjs)
library(miniUI)

mtInit <- function(inputValue1, inputValue2) {
  # --------------------------------------------------------------------------
  ui <- miniPage(
    useShinyjs(),  # http://stackoverflow.com/questions/24973549/r-shiny-key-input-binding
    tags$head(tags$script('
        $(document).on("keydown", function (e) {
          Shiny.onInputChange("keyz", e.which);
        });
    ')),
    gadgetTitleBar(strong('mt')),
    miniTabstripPanel(
      miniTabPanel('Parameters', icon=icon('sliders'),
                   miniContentPanel(  # 1st view
                     textInput('line', 'Enter URLs', '', '100%', 'http:// or https://'),
                     htmlOutput('mirror'),
                     tags$div(id='reset-blk', actionLink('reset', 'Reset URLs'), br(), br()),
                     checkboxGroupInput('checks', 'Choose meta info to get', 
                                        choices = list("Title"=1, "Description"=2, "Keywords"=3),
                                        selected = c(1, 2, 3)),
                     miniButtonBlock(actionLink('submit', strong('Get info for given URLs!'))), br()
                   )
      ),
      miniTabPanel('Data', icon=icon('table'),
                   miniContentPanel(  # 2nd view
                     strong('Return data'),
                     htmlOutput('success')
                   )
      )
    )
  )
  # --------------------------------------------------------------------------
  server <- function(input, output, session) {  # input$checks
    store <- reactiveValues(uris=character(), cnvt=character(),
                            params=list(), mrx=matrix())
    lapply(list('mirror', 'reset-blk', 'submit'), hide)  # hide on launch
    # event listener 4 js keydown, updating store$uris
    observeEvent(input$keyz, {
      if (input$keyz == 13 & grepl('^https?://[^\\.]+\\..{2,}', input$line)) {
        store$uris[length(store$uris)+1] <- trimws(input$line)
        updateTextInput(session, 'line', NULL, '')
        lapply(list('mirror', 'reset-blk', 'submit'), show)
      }
    })
    # reset btn
    observeEvent(input$reset, {
      store$uris <- character()
      lapply(list('mirror', 'reset-blk', 'submit'), hide)
    })
    # done btn
    observeEvent(input$done, { stopApp('done') })  # @param Return value
    # reflects valid input uris
    output$mirror <- renderUI({  # let only store$uris update ui #mirror
      store$cnvt <- sapply(store$uris, function(x) { paste0(x, '<br/>') })
      HTML(paste0(store$cnvt))
    })
    # TODO: get btn and returning
    
  }
  # --------------------------------------------------------------------------
  runGadget(ui, server)
}
# --------------------------------------------------------------------------
mtInit()