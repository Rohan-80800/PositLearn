import { useState, useEffect } from "react";
import { Table, Pagination, ConfigProvider, Flex } from "antd";
import { Colors } from "../config/color";

const CustomTable = ({
  columns,
  dataSource,
  rowKey = "id",
  pageSize = 5,
  totalItems: propTotalItems
}) => {
  const colors = Colors();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(
    propTotalItems || dataSource.length
  );

  useEffect(() => {
    setTotalItems(
      propTotalItems !== undefined ? propTotalItems : dataSource.length
    );
  }, [dataSource, propTotalItems]);

  useEffect(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedData = dataSource.slice(startIndex, startIndex + pageSize);

    if (paginatedData.length === 0 && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }, [dataSource, currentPage, pageSize]);

  const handlePageChange = (page) => {
    const totalPages = Math.ceil(totalItems / pageSize);
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = dataSource.slice(startIndex, startIndex + pageSize);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorBgContainer: colors.background,
          colorText: colors.textcolor,
          colorBorder: colors.background
        },
        components: {
          Table: {
            headerBg: "transparent",
            rowHoverBg: colors.theme,
            borderColor: colors.border
          },
          Pagination: {
            colorTextDisabled: colors.border
          }
        }
      }}
    >
      <Flex vertical className="!min-h-[400px] !h-full">
        <Flex className="!flex-grow !overflow-auto">
          <Table
            key={JSON.stringify(colors)}
            className="!w-full !rounded-none !border-t 
            [&_.ant-table]:!rounded-none [&_.ant-table-container]:!rounded-none 
            [&_.ant-table-thead]:!rounded-none [&_.ant-table-tbody]:!rounded-none
            [&_.ant-table-cell]:!rounded-none [&_.ant-table-content]:!rounded-none
            [&_.ant-table-tbody>tr]:h-full
            [&_.ant-table-tbody]:h-full
            [&_.ant-table-tbody>tr>td]:align-middle"
            columns={columns}
            dataSource={paginatedData}
            rowKey={rowKey}
            pagination={false}
            scroll={{ x: "max-content" }}
            style={{ borderColor: colors.border, height: "100%" }}
          />
        </Flex>
        {totalItems > pageSize && (
          <Flex justify="center" className="!mt-auto !py-2">
            <Pagination
              current={currentPage}
              total={totalItems}
              pageSize={pageSize}
              onChange={handlePageChange}
              simple
              responsive
              className="text-sm flex justify-center [&_.ant-pagination-simple-pager_input]:w-[20px] 
                 text-center [&_.ant-pagination-simple-pager_input]:p-0 
                 [&_.ant-pagination-simple-pager_input]:!border-0 
                 focus:[&_.ant-pagination-simple-pager_input]:outline-none"
            />
          </Flex>
        )}
      </Flex>
    </ConfigProvider>
  );
};

export default CustomTable;