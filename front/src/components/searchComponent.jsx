import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Divider, Flex, Input, Tag, Typography, Row } from "antd";
import { SearchOutlined, ProjectOutlined, MessageOutlined, ReadOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { setSearchText, clearSearchText } from "../redux/navbarSlice";
import typesenseClient from "../typesense/typesenseClient";
import { useUser } from "@clerk/clerk-react";
import { usePermissions, Role } from "../permissions";
const SearchComponent = ({ colors }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { searchText } = useSelector((state) => state.navbar);
  const { user, isSignedIn, isLoaded } = useUser();
  const { role } = usePermissions();
  const { Text } = Typography;

  const isAdmin = isSignedIn && role === Role.Admin;
  const userId = isSignedIn ? user?.id : null;
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const handleSearch = async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      setSearchError(null);
      return;
    }
  
    try {
      setIsSearching(true);
      setHasSearched(true);
      setSearchError(null);

      const searches = [
        typesenseClient.collections("projects").documents().search({
          q: query,
          query_by: "project_name,description",
          highlight_fields: "project_name,description",
          highlight_start_tag: '<mark class="!bg-[#f1f578] rounded">',
          highlight_end_tag: '</mark>',
          per_page: 3,
          filter_by: isAdmin ? "" : (userId ? `team_user_ids:${userId}` : ""),
        }),
        typesenseClient.collections("discussions").documents().search({
          q: query,
          query_by: "title,description",
          highlight_fields: "title,description",
          highlight_start_tag: '<mark class="!bg-[#f1f578] rounded">',
          highlight_end_tag: '</mark>',
          per_page: 3,
          filter_by: isAdmin ? "" : (userId ? `team_user_ids:${userId}` : ""),
        }),
      ];

    if (!isAdmin && userId) {
      searches.push(
        typesenseClient.collections("learning_content").documents().search({
          q: query,
          query_by: "title",
          highlight_fields: "title",
          highlight_start_tag: '<mark class="!bg-[#f1f578] rounded">',
          highlight_end_tag: '</mark>',
          per_page: 3
        })
      );
    }

      const results = await Promise.all(searches);

      const projectResults = results[0].hits || [];
      const discussionResults = results[1].hits || [];
      const learningResults = isAdmin ? [] : results[2]?.hits || [];

       if (projectResults.length === 0 && discussionResults.length === 0 && learningResults.length === 0) {
        setSearchResults([]);
        return;
      }
      
      const transformedResults = [];
      if (projectResults.length > 0) {
        transformedResults.push({
          type: 'section',
          label: 'Projects',
          color: 'blue'
        });
      
        transformedResults.push(
          ...projectResults.map((hit) => ({
          type: 'project',
              value: `project-${hit.document.id}`,
              label: (
                <div className="ml-2">
                  <div dangerouslySetInnerHTML={{ __html: hit.highlight?.project_name?.snippet || hit.document.project_name }} />
                  {hit.highlight?.description?.snippet && (
                    <div className="text-xs" style={{ color: colors.secondaryText }} dangerouslySetInnerHTML={{ __html: hit.highlight?.description?.snippet }} />
                  )}
                </div>
              ),
              document: hit.document,
            }))
        );
      }      
      
      if (discussionResults.length > 0) {
        transformedResults.push({
          type: 'section',
          label: 'Discussions',
          color: 'green'
        });
      
        transformedResults.push(
          ...discussionResults.map((hit) => ({
              type: 'discussion',
              value: `discussion-${hit.document.id}`,
              label: (
                <div className="ml-2">
                  <div dangerouslySetInnerHTML={{ __html: hit.highlight?.title?.snippet || hit.document.title }} />
                  {hit.highlight?.description?.snippet && (
                    <div className="text-xs" style={{ color: colors.secondaryText }} dangerouslySetInnerHTML={{ __html: hit.highlight?.description?.snippet }} />
                  )}
                </div>
              ),
              document: hit.document,
            }))
          );
        }

        if (!isAdmin && learningResults.length > 0) {
          transformedResults.push({
            type: 'section',
            label: 'Learning',
            color: 'orange'
          });

          transformedResults.push(
            ...learningResults.map((hit) => ({
              type: 'learning',
              value: `learning-${hit.document.id}`,
              label: (
                <div className="ml-2">
                  <div dangerouslySetInnerHTML={{ __html: hit.highlight?.title?.snippet || hit.document.title }} />
                </div>
              ),
              document: hit.document,
            }))
          );
        }

      setSearchResults(transformedResults);
    } catch (error) {
      setSearchError(error.message || "Search failed. Please try again.");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

    const handleSelect = (_value, option) => {
      if (option.type === "project") {
        navigate(`/projects/${option.document.id}/details`);
      } else if (option.type === "discussion") {
        navigate(`/discussions/${option.document.id}`);
      } else if (option.type === "learning") {
        const sectionIndex = parseInt(option.document.id);
        navigate(`/git-github?tab=${sectionIndex + 1}&page=1`);
      }  
      dispatch(clearSearchText());
      setIsModalVisible(false);
    };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      handleSearch(searchText);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchText, userId, isAdmin, isLoaded]);

  return (
    <Flex className="relative w-full">
  {isModalVisible && (
    <Row
      className="fixed inset-0 z-[1000] cursor-pointer bg-black/60"
      style={{ top: 0, pointerEvents: "auto" }}
      onClick={() => {
        dispatch(clearSearchText());
        setIsModalVisible(false);
      }}
    />
  )}

  <Row className="w-full" onClick={() => setIsModalVisible(true)}>
      <Input
        placeholder={isLoaded ? "Search" : "Loading authentication..."}
        prefix={<SearchOutlined />}
        style={{ backgroundColor: "transparent", color: colors.textcolor, cursor: "pointer" }}
        readOnly
      />
      </Row>
        {isModalVisible && (
        <Flex
          className="fixed top-[65px] left-1/2 -translate-x-1/2 w-[85vw] max-w-[500px] mx-auto !p-0 !rounded-b-lg shadow-[0_4px_12px_rgba(0,0,0,0.15)] z-[1001]"
          vertical
        >
          <Flex
            vertical
            className="!rounded-b-lg"
            style={{ backgroundColor: colors.background }}
          >
            <Flex className="!px-2 !mt-4">
              <Input
                placeholder={isAdmin ? "Search projects and discussions..." : "Search projects, discussions, and learning content..."}
                allowClear
                prefix={<SearchOutlined />}
                size="large"
                value={searchText}
                onChange={(e) => dispatch(setSearchText(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchResults.length > 0) {
                    const firstResult = searchResults.find((r) => r.type !== 'section');
                    if (firstResult) {
                      handleSelect(firstResult.value, firstResult);
                    }
                  }
                }}
                autoFocus
                style={{
                  backgroundColor: colors.theme,
                  color: colors.textcolor,
                  }}
                />
              </Flex>
            <Flex className="!p-0 !m-0" vertical>
              {searchError && (
                <Flex justify="center" className="p-2">
                  <Text style={{ color: "red" }}>{searchError}</Text>
                </Flex>
              )}
              {isSearching ? (
                <Text
                  className="!text-center !p-2"
                  style={{ color: colors.textcolor }}
                >
                    Searching...
                 </Text>
                ) : searchResults.length > 0 ? (
                  <Flex className="!p-0 !m-0" vertical>
                    {searchResults.map((result, index) => {
                      if (result.type === 'section') {
                        let icon;
                        if (result.label === 'Projects') {
                          icon = <ProjectOutlined className="mr-2" />;
                        } else if (result.label === 'Discussions') {
                          icon = <MessageOutlined className="mr-2" />;
                        } else {
                          icon = <ReadOutlined className="mr-2" />;
                        }
                      
                        return (
                          <Tag 
                            key={`section-${index}`}
                            color={result.color} 
                            className="!p-2 !text-base !leading-[0] !w-full !rounded !border-none !block"
                          >
                            <Flex align="center">
                              {icon}
                              <Text className="font-bold">{result.label}</Text>
                            </Flex>
                          </Tag>
                          
                        );
                      }
                      return (
                        <Row key={result.value} style={{ width: "100%" }}>
                        {index > 0 &&
                          searchResults[index - 1]?.type !== "section" && (
                            <Divider
                              className="border-t"
                              style={{
                                borderColor: colors.border,
                                margin: 0,
                              }}
                              plain={false}
                            />
                          )}
                        <Flex
                          className="!p-2 !m-0 !leading-[1rem] cursor-pointer"
                          style={{ 
                            color: colors.textcolor,
                            backgroundColor: 'transparent',
                            transition: 'background-color 0.2s ease',
                            ':hover': {
                              backgroundColor: colors.hoverGray,
                            }
                          }}
                          onClick={() => handleSelect(result.value, result)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = colors.hoverGray;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <Text style={{ color: "inherit" }}>
                            {result.label}
                          </Text>
                        </Flex>
                      </Row>
                    );
                  })}
                </Flex>
              ) : hasSearched ? (
                <Flex justify="center" className="!p-6">
                  <Text
                    style={{ color: colors.textcolor, textAlign: "center" }}
                  >
                    No results found
                  </Text>
                </Flex>
                ) : (
                  <Flex justify="center" className="!p-6">
                  <Text
                    style={{ color: colors.textcolor, textAlign: "center" }}
                  >
                    Type to search (minimum 2 characters)
                  </Text>
                </Flex>
              )}
            </Flex>
          </Flex>
        </Flex>
      )}
    </Flex>
  );
};

export default SearchComponent;
